package com.wordmind.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.wordmind.app.data.Tag
import com.wordmind.app.data.Textbook
import com.wordmind.app.data.Word
import com.wordmind.app.data.WordDraft
import com.wordmind.app.data.WordMindApi
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
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
        mutableStateOf(existing?.groups?.firstOrNull()?.textbookId ?: existing?.textbookId)
    }
    var selectedGroupIds by remember(existing?.id) {
        mutableStateOf(
            existing?.groups?.map { it.groupId }?.toSet()
                ?.takeIf { it.isNotEmpty() }
                ?: existing?.groupId?.let { setOf(it) }
                ?: emptySet(),
        )
    }
    var selectedTagIds by remember(existing?.id) {
        mutableStateOf(existing?.tags?.map { it.id }?.toSet() ?: emptySet())
    }
    var textbookMenuExpanded by remember { mutableStateOf(false) }
    var unitMenuExpanded by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val selectedTextbook = textbooks.firstOrNull { it.id == selectedTextbookId }
    val units = textbooks.firstOrNull { it.id == selectedTextbookId }?.groups.orEmpty()
    val selectedUnits = units.filter { it.id in selectedGroupIds }

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
                        groupIds = selectedGroupIds.toList(),
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
                FieldTitle("课本与单元（可多选）")
                Spacer(Modifier.height(5.dp))
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    color = Color(0xFFF8FAFC),
                ) {
                    val memberships = textbooks.flatMap { textbook ->
                        textbook.groups
                            .filter { it.id in selectedGroupIds }
                            .map { unit -> "${textbook.name} · ${unit.name}" }
                    }
                    Text(
                        if (memberships.isEmpty()) {
                            "扩展词汇（未关联课本）"
                        } else {
                            memberships.joinToString("；")
                        },
                        modifier = Modifier.padding(horizontal = 11.dp, vertical = 8.dp),
                        color = Color(0xFF475569),
                        fontSize = 12.sp,
                        lineHeight = 18.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Spacer(Modifier.height(5.dp))
                Text(
                    "先选择课本，再选择单元；可保留多个课本和单元。",
                    color = Color(0xFF94A3B8),
                    fontSize = 11.sp,
                )

                Spacer(Modifier.height(8.dp))
                ExposedDropdownMenuBox(
                    expanded = textbookMenuExpanded,
                    onExpandedChange = { textbookMenuExpanded = !textbookMenuExpanded },
                ) {
                    OutlinedTextField(
                        value = selectedTextbook?.name ?: "扩展词汇",
                        onValueChange = {},
                        modifier = Modifier
                            .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                            .fillMaxWidth(),
                        readOnly = true,
                        singleLine = true,
                        label = { Text("课本") },
                        trailingIcon = {
                            ExposedDropdownMenuDefaults.TrailingIcon(
                                expanded = textbookMenuExpanded,
                            )
                        },
                        shape = RoundedCornerShape(12.dp),
                    )
                    ExposedDropdownMenu(
                        expanded = textbookMenuExpanded,
                        onDismissRequest = { textbookMenuExpanded = false },
                    ) {
                        DropdownMenuItem(
                            text = { Text("扩展词汇（清空课本关联）") },
                            onClick = {
                                selectedTextbookId = null
                                selectedGroupIds = emptySet()
                                textbookMenuExpanded = false
                            },
                        )
                        textbooks.forEach { textbook ->
                            DropdownMenuItem(
                                text = { Text(textbook.name) },
                                onClick = {
                                    selectedTextbookId = textbook.id
                                    textbookMenuExpanded = false
                                },
                            )
                        }
                    }
                }

                if (selectedTextbookId != null) {
                    Spacer(Modifier.height(8.dp))
                    ExposedDropdownMenuBox(
                        expanded = unitMenuExpanded,
                        onExpandedChange = { unitMenuExpanded = !unitMenuExpanded },
                    ) {
                        OutlinedTextField(
                            value = when (selectedUnits.size) {
                                0 -> "请选择单元"
                                1 -> selectedUnits.first().name
                                else -> "已选 ${selectedUnits.size} 个单元"
                            },
                            onValueChange = {},
                            modifier = Modifier
                                .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                                .fillMaxWidth(),
                            readOnly = true,
                            singleLine = true,
                            label = { Text("单元（可多选）") },
                            trailingIcon = {
                                ExposedDropdownMenuDefaults.TrailingIcon(
                                    expanded = unitMenuExpanded,
                                )
                            },
                            shape = RoundedCornerShape(12.dp),
                        )
                        ExposedDropdownMenu(
                            expanded = unitMenuExpanded,
                            onDismissRequest = { unitMenuExpanded = false },
                        ) {
                            units.forEach { unit ->
                                val selected = unit.id in selectedGroupIds
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            if (selected) "✓  ${unit.name}" else unit.name,
                                            fontWeight = if (selected) {
                                                FontWeight.SemiBold
                                            } else {
                                                FontWeight.Normal
                                            },
                                        )
                                    },
                                    onClick = {
                                        selectedGroupIds = if (selected) {
                                            selectedGroupIds - unit.id
                                        } else {
                                            selectedGroupIds + unit.id
                                        }
                                        unitMenuExpanded = false
                                    },
                                )
                            }
                            if (units.isEmpty()) {
                                DropdownMenuItem(
                                    text = { Text("该课本暂无单元") },
                                    enabled = false,
                                    onClick = {},
                                )
                            }
                        }
                    }
                }

                if (tags.isNotEmpty()) {
                    Spacer(Modifier.height(8.dp))
                    FieldTitle("标签（可多选）")
                    Spacer(Modifier.height(5.dp))
                    FlowRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(7.dp),
                        verticalArrangement = Arrangement.spacedBy(7.dp),
                    ) {
                        tags.sortedBy { it.name }.forEach { tag ->
                            FilterChip(
                                selected = tag.id in selectedTagIds,
                                onClick = {
                                    selectedTagIds = if (tag.id in selectedTagIds) {
                                        selectedTagIds - tag.id
                                    } else {
                                        selectedTagIds + tag.id
                                    }
                                },
                                label = {
                                    Text(
                                        tag.name,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                },
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
