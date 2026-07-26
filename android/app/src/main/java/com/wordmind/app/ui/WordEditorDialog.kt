package com.wordmind.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.wordmind.app.data.Tag
import com.wordmind.app.data.Textbook
import com.wordmind.app.data.Word
import com.wordmind.app.data.WordDraft
import com.wordmind.app.data.WordMindApi
import kotlinx.coroutines.launch

@Composable
internal fun WordEditorDialog(
    api: WordMindApi,
    existing: Word?,
    textbooks: List<Textbook>,
    tags: List<Tag>,
    onSaved: () -> Unit,
    onDismiss: () -> Unit,
    onMessage: (String) -> Unit,
) {
    var word by rememberSaveable(existing?.id) { mutableStateOf(existing?.word.orEmpty()) }
    var phonetic by rememberSaveable(existing?.id) { mutableStateOf(existing?.phonetic.orEmpty()) }
    var definition by rememberSaveable(existing?.id) { mutableStateOf(existing?.definition.orEmpty()) }
    var example by rememberSaveable(existing?.id) { mutableStateOf(existing?.example.orEmpty()) }
    var notes by rememberSaveable(existing?.id) { mutableStateOf(existing?.notes.orEmpty()) }
    var selectedTextbookId by rememberSaveable(existing?.id) {
        mutableStateOf(existing?.textbookId)
    }
    var selectedGroupId by rememberSaveable(existing?.id) { mutableStateOf(existing?.groupId) }
    var selectedTagIds by remember(existing?.id) {
        mutableStateOf(existing?.tags?.map { it.id }?.toSet() ?: emptySet())
    }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val units = textbooks.firstOrNull { it.id == selectedTextbookId }?.groups.orEmpty()

    fun save() {
        if (word.isBlank() || definition.isBlank() || saving) return
        saving = true
        scope.launch {
            try {
                api.saveWord(
                    id = existing?.id,
                    draft = WordDraft(
                        word = word,
                        phonetic = phonetic,
                        definition = definition,
                        example = example,
                        notes = notes,
                        groupId = selectedGroupId,
                        tagIds = selectedTagIds.toList(),
                    ),
                )
                onSaved()
            } catch (error: Exception) {
                error.rethrowIfCancellation()
                onMessage(error.message ?: "保存单词失败")
                saving = false
            }
        }
    }

    Dialog(onDismissRequest = { if (!saving) onDismiss() }) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 760.dp)
                .imePadding(),
            shape = RoundedCornerShape(22.dp),
            color = Color.White,
            shadowElevation = 16.dp,
        ) {
            Column(
                modifier = Modifier
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
            ) {
                Text(
                    if (existing == null) "添加单词" else "编辑单词",
                    fontSize = 21.sp,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(16.dp))
                OutlinedTextField(
                    value = word,
                    onValueChange = { word = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("英文单词 *") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = phonetic,
                    onValueChange = { phonetic = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("音标") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = definition,
                    onValueChange = { definition = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("中文释义 *") },
                    minLines = 2,
                    shape = RoundedCornerShape(12.dp),
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = example,
                    onValueChange = { example = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("例句") },
                    minLines = 2,
                    shape = RoundedCornerShape(12.dp),
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("备注") },
                    minLines = 2,
                    shape = RoundedCornerShape(12.dp),
                )

                Spacer(Modifier.height(15.dp))
                FieldTitle("所属课本")
                LazyRow(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                    item {
                        FilterChip(
                            selected = selectedTextbookId == null,
                            onClick = {
                                selectedTextbookId = null
                                selectedGroupId = null
                            },
                            label = { Text("扩展词汇") },
                        )
                    }
                    items(textbooks, key = { it.id }) { textbook ->
                        FilterChip(
                            selected = selectedTextbookId == textbook.id,
                            onClick = {
                                selectedTextbookId = textbook.id
                                if (textbook.groups.none { it.id == selectedGroupId }) {
                                    selectedGroupId = textbook.groups.firstOrNull()?.id
                                }
                            },
                            label = { Text(textbook.name) },
                        )
                    }
                }

                if (selectedTextbookId != null) {
                    Spacer(Modifier.height(8.dp))
                    FieldTitle("所属单元")
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                        item {
                            FilterChip(
                                selected = selectedGroupId == null,
                                onClick = { selectedGroupId = null },
                                label = { Text("未分组") },
                            )
                        }
                        items(units, key = { it.id }) { unit ->
                            FilterChip(
                                selected = selectedGroupId == unit.id,
                                onClick = { selectedGroupId = unit.id },
                                label = { Text(unit.name) },
                            )
                        }
                    }
                }

                if (tags.isNotEmpty()) {
                    Spacer(Modifier.height(8.dp))
                    FieldTitle("标签（可多选）")
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                        items(tags.sortedBy { it.name }, key = { it.id }) { tag ->
                            FilterChip(
                                selected = tag.id in selectedTagIds,
                                onClick = {
                                    selectedTagIds = if (tag.id in selectedTagIds) {
                                        selectedTagIds - tag.id
                                    } else {
                                        selectedTagIds + tag.id
                                    }
                                },
                                label = { Text(tag.name) },
                            )
                        }
                    }
                }

                Spacer(Modifier.height(18.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f),
                        enabled = !saving,
                    ) {
                        Text("取消")
                    }
                    Button(
                        onClick = { save() },
                        modifier = Modifier.weight(1f),
                        enabled = word.isNotBlank() && definition.isNotBlank() && !saving,
                    ) {
                        if (saving) {
                            CircularProgressIndicator(
                                modifier = Modifier.height(20.dp),
                                color = Color.White,
                                strokeWidth = 2.dp,
                            )
                        } else {
                            Text("保存")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FieldTitle(text: String) {
    Text(
        text,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        fontSize = 12.sp,
        fontWeight = FontWeight.Medium,
    )
}

@Composable
internal fun ConfirmDeleteDialog(
    title: String,
    text: String,
    busy: Boolean = false,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        title = { Text(title) },
        text = { Text(text) },
        confirmButton = {
            Button(onClick = onConfirm, enabled = !busy) {
                if (busy) {
                    CircularProgressIndicator(
                        modifier = Modifier.height(18.dp),
                        color = Color.White,
                        strokeWidth = 2.dp,
                    )
                } else {
                    Text("删除")
                }
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss, enabled = !busy) {
                Text("取消")
            }
        },
    )
}
