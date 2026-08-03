package com.wordmind.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Label
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wordmind.app.data.Tag
import com.wordmind.app.data.Textbook
import com.wordmind.app.data.UnitGroup
import com.wordmind.app.data.Word
import com.wordmind.app.data.WordMindApi
import kotlinx.coroutines.launch
import java.util.Locale

private val AdminMuted = Color(0xFF64748B)
private val AdminIndigo = Color(0xFF4F46E5)
private val AdminTagComparator = compareBy<Tag>(
    { tag ->
        val firstCharacter = tag.name.trim().firstOrNull()
        if (firstCharacter in 'a'..'z' || firstCharacter in 'A'..'Z') 0 else 1
    },
    { tag -> tag.name.trim().lowercase(Locale.ROOT) },
    { tag -> tag.name.trim() },
    { tag -> tag.id },
)

private sealed interface DeleteTarget {
    data class Book(val textbook: Textbook) : DeleteTarget
    data class Unit(val unit: UnitGroup) : DeleteTarget
    data class WordTag(val tag: Tag) : DeleteTarget
}

@Composable
internal fun AdminScreen(
    api: WordMindApi,
    textbooks: List<Textbook>,
    tags: List<Tag>,
    words: List<Word>,
    speak: (String) -> Unit,
    onChanged: () -> Unit,
    onMessage: (String) -> Unit,
) {
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var textbookDialogOpen by remember { mutableStateOf(false) }
    var editingTextbook by remember { mutableStateOf<Textbook?>(null) }
    var unitDialogOpen by remember { mutableStateOf(false) }
    var editingUnit by remember { mutableStateOf<UnitGroup?>(null) }
    var unitTextbookId by remember { mutableIntStateOf(0) }
    var tagDialogOpen by remember { mutableStateOf(false) }
    var editingTag by remember { mutableStateOf<Tag?>(null) }
    var deleteTarget by remember { mutableStateOf<DeleteTarget?>(null) }
    var detailTag by remember { mutableStateOf<Tag?>(null) }
    var deleting by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text("共享数据管理", fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(4.dp))
            Text("这里的修改会同步给所有账号", color = AdminMuted, fontSize = 13.sp)
        }
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                FilterChip(
                    selected = tab == 0,
                    onClick = { tab = 0 },
                    label = { Text("课本与单元 (${textbooks.size})") },
                    leadingIcon = {
                        Icon(
                            Icons.AutoMirrored.Filled.MenuBook,
                            contentDescription = null,
                            modifier = Modifier.size(17.dp),
                        )
                    },
                )
                FilterChip(
                    selected = tab == 1,
                    onClick = { tab = 1 },
                    label = { Text("标签 (${tags.size})") },
                    leadingIcon = {
                        Icon(
                            Icons.AutoMirrored.Filled.Label,
                            contentDescription = null,
                            modifier = Modifier.size(17.dp),
                        )
                    },
                )
            }
        }
        item {
            Button(
                onClick = {
                    if (tab == 0) {
                        editingTextbook = null
                        textbookDialogOpen = true
                    } else {
                        editingTag = null
                        tagDialogOpen = true
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
            ) {
                Icon(Icons.Default.Add, contentDescription = null)
                Spacer(Modifier.size(7.dp))
                Text(if (tab == 0) "新建课本" else "新建标签")
            }
        }

        if (tab == 0) {
            if (textbooks.isEmpty()) {
                item { EmptyAdmin("暂无课本") }
            } else {
                items(textbooks, key = { it.id }) { textbook ->
                    AdminTextbookCard(
                        textbook = textbook,
                        onEdit = {
                            editingTextbook = textbook
                            textbookDialogOpen = true
                        },
                        onDelete = { deleteTarget = DeleteTarget.Book(textbook) },
                        onAddUnit = {
                            unitTextbookId = textbook.id
                            editingUnit = null
                            unitDialogOpen = true
                        },
                        onEditUnit = { unit ->
                            unitTextbookId = textbook.id
                            editingUnit = unit
                            unitDialogOpen = true
                        },
                        onDeleteUnit = { deleteTarget = DeleteTarget.Unit(it) },
                    )
                }
            }
        } else {
            if (tags.isEmpty()) {
                item { EmptyAdmin("暂无标签") }
            } else {
                items(
                    tags.sortedWith(AdminTagComparator),
                    key = { it.id },
                ) { tag ->
                    AdminTagCard(
                        tag = tag,
                        onClick = { detailTag = tag },
                        onEdit = {
                            editingTag = tag
                            tagDialogOpen = true
                        },
                        onDelete = { deleteTarget = DeleteTarget.WordTag(tag) },
                    )
                }
            }
        }
    }

    if (textbookDialogOpen) {
        NameDescriptionDialog(
            title = if (editingTextbook == null) "新建课本" else "编辑课本",
            initialName = editingTextbook?.name.orEmpty(),
            initialDescription = editingTextbook?.description.orEmpty(),
            nameLabel = "课本名称",
            onDismiss = { textbookDialogOpen = false },
            onSave = { name, description ->
                api.saveTextbook(editingTextbook?.id, name, description)
            },
            onSaved = {
                textbookDialogOpen = false
                onChanged()
            },
            onMessage = onMessage,
        )
    }

    if (unitDialogOpen) {
        NameDescriptionDialog(
            title = if (editingUnit == null) "新建单元" else "编辑单元",
            initialName = editingUnit?.name.orEmpty(),
            initialDescription = editingUnit?.description.orEmpty(),
            nameLabel = "单元名称",
            onDismiss = { unitDialogOpen = false },
            onSave = { name, description ->
                api.saveUnit(editingUnit?.id, unitTextbookId, name, description)
            },
            onSaved = {
                unitDialogOpen = false
                onChanged()
            },
            onMessage = onMessage,
        )
    }

    if (tagDialogOpen) {
        NameDescriptionDialog(
            title = if (editingTag == null) "新建标签" else "编辑标签",
            initialName = editingTag?.name.orEmpty(),
            initialDescription = editingTag?.description.orEmpty(),
            nameLabel = "标签名称",
            onDismiss = { tagDialogOpen = false },
            onSave = { name, description ->
                api.saveTag(editingTag?.id, name, description)
            },
            onSaved = {
                tagDialogOpen = false
                onChanged()
            },
            onMessage = onMessage,
        )
    }

    detailTag?.let { selectedTag ->
        NativeTagDetailDialog(
            tag = selectedTag,
            words = words
                .filter { word -> word.tags.any { it.id == selectedTag.id } }
                .sortedBy { it.word.lowercase(Locale.ROOT) },
            speak = speak,
            onDismiss = { detailTag = null },
        )
    }

    deleteTarget?.let { target ->
        val (title, text) = when (target) {
            is DeleteTarget.Book -> "删除课本" to
                "确定删除“${target.textbook.name}”吗？其中的单词会转入未分组，不会被删除。"
            is DeleteTarget.Unit -> "删除单元" to
                "确定删除“${target.unit.name}”吗？其中的单词会转入未分组。"
            is DeleteTarget.WordTag -> "删除标签" to
                "确定删除“${target.tag.name}”吗？单词本身不会被删除。"
        }
        ConfirmDeleteDialog(
            title = title,
            text = text,
            busy = deleting,
            onDismiss = { deleteTarget = null },
            onConfirm = {
                if (!deleting) {
                    deleting = true
                    scope.launch {
                        try {
                            when (target) {
                                is DeleteTarget.Book -> api.deleteTextbook(target.textbook.id)
                                is DeleteTarget.Unit -> api.deleteUnit(target.unit.id)
                                is DeleteTarget.WordTag -> api.deleteTag(target.tag.id)
                            }
                            deleteTarget = null
                            onChanged()
                        } catch (error: Exception) {
                            error.rethrowIfCancellation()
                            onMessage(error.message ?: "删除失败")
                        } finally {
                            deleting = false
                        }
                    }
                }
            },
        )
    }
}

@Composable
private fun AdminTextbookCard(
    textbook: Textbook,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onAddUnit: () -> Unit,
    onEditUnit: (UnitGroup) -> Unit,
    onDeleteUnit: (UnitGroup) -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = CardDefaults.outlinedCardBorder(),
    ) {
        Column(Modifier.padding(15.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(textbook.name, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
                    Text(
                        "${textbook.groups.size} 个单元 · ${textbook.groups.sumOf { it.wordCount }} 个单词",
                        color = AdminMuted,
                        fontSize = 12.sp,
                    )
                }
                IconButton(onClick = onEdit) {
                    Icon(Icons.Default.Edit, contentDescription = "编辑课本", tint = AdminIndigo)
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, contentDescription = "删除课本", tint = Color(0xFFDC2626))
                }
            }
            textbook.description?.takeIf { it.isNotBlank() }?.let {
                Text(it, color = AdminMuted, fontSize = 13.sp)
                Spacer(Modifier.height(8.dp))
            }
            HorizontalDivider()
            textbook.groups.forEach { unit ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .padding(vertical = 7.dp),
                    ) {
                        Text(unit.name, fontSize = 14.sp)
                        Text("${unit.wordCount} 个单词", color = AdminMuted, fontSize = 11.sp)
                    }
                    IconButton(onClick = { onEditUnit(unit) }, modifier = Modifier.size(36.dp)) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = "编辑单元",
                            modifier = Modifier.size(18.dp),
                        )
                    }
                    IconButton(onClick = { onDeleteUnit(unit) }, modifier = Modifier.size(36.dp)) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = "删除单元",
                            modifier = Modifier.size(18.dp),
                            tint = Color(0xFFDC2626),
                        )
                    }
                }
            }
            OutlinedButton(
                onClick = onAddUnit,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp),
            ) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.size(6.dp))
                Text("添加单元")
            }
        }
    }
}

@Composable
private fun AdminTagCard(
    tag: Tag,
    onClick: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = CardDefaults.outlinedCardBorder(),
    ) {
        Row(
            modifier = Modifier.padding(start = 15.dp, top = 9.dp, bottom = 9.dp, end = 5.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.AutoMirrored.Filled.Label,
                contentDescription = null,
                tint = Color(0xFF059669),
            )
            Spacer(Modifier.size(11.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(tag.name, fontWeight = FontWeight.Medium)
                Text(
                    tag.description?.takeIf { it.isNotBlank() } ?: "${tag.wordCount} 个单词",
                    color = AdminMuted,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            IconButton(onClick = onEdit) {
                Icon(Icons.Default.Edit, contentDescription = "编辑标签", tint = AdminIndigo)
            }
            IconButton(onClick = onDelete) {
                Icon(Icons.Default.Delete, contentDescription = "删除标签", tint = Color(0xFFDC2626))
            }
        }
    }
}

@Composable
private fun EmptyAdmin(text: String) {
    Text(
        text,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 40.dp),
        color = AdminMuted,
        fontSize = 14.sp,
    )
}

@Composable
private fun NameDescriptionDialog(
    title: String,
    initialName: String,
    initialDescription: String,
    nameLabel: String,
    onDismiss: () -> Unit,
    onSave: suspend (String, String) -> Unit,
    onSaved: () -> Unit,
    onMessage: (String) -> Unit,
) {
    var name by remember(initialName) { mutableStateOf(initialName) }
    var description by remember(initialDescription) { mutableStateOf(initialDescription) }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        title = { Text(title) },
        text = {
            Column {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text(nameLabel) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("备注（可选）") },
                    minLines = 2,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    saving = true
                    scope.launch {
                        try {
                            onSave(name, description)
                            onSaved()
                        } catch (error: Exception) {
                            error.rethrowIfCancellation()
                            onMessage(error.message ?: "保存失败")
                            saving = false
                        }
                    }
                },
                enabled = name.isNotBlank() && !saving,
            ) {
                if (saving) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        color = Color.White,
                        strokeWidth = 2.dp,
                    )
                } else {
                    Text("保存")
                }
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss, enabled = !saving) { Text("取消") }
        },
    )
}
