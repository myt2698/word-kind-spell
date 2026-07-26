package com.wordmind.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Label
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.wordmind.app.data.Tag
import com.wordmind.app.data.Word

private val TagIndigo = Color(0xFF4F46E5)
private val TagBorder = Color(0xFFE2E8F0)
private val TagMuted = Color(0xFF64748B)

@Composable
internal fun NativeTagDetailDialog(
    tag: Tag,
    words: List<Word>,
    speak: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.84f),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 18.dp, top = 12.dp, end = 8.dp, bottom = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Surface(
                        shape = RoundedCornerShape(9.dp),
                        color = Color(0xFFEEF2FF),
                        border = BorderStroke(1.dp, Color(0xFFC7D2FE)),
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.Label,
                            contentDescription = null,
                            modifier = Modifier.padding(8.dp).size(18.dp),
                            tint = TagIndigo,
                        )
                    }
                    Spacer(Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            tag.name,
                            fontSize = 19.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0F172A),
                        )
                        Text(
                            "包含 ${words.size} 个单词",
                            fontSize = 12.sp,
                            color = TagMuted,
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "关闭")
                    }
                }
                if (!tag.description.isNullOrBlank()) {
                    Text(
                        tag.description,
                        modifier = Modifier.padding(horizontal = 18.dp, vertical = 4.dp),
                        color = Color(0xFF475569),
                        fontSize = 13.sp,
                        lineHeight = 19.sp,
                    )
                }
                HorizontalDivider(color = TagBorder)

                if (words.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("这个标签下还没有单词", color = TagMuted)
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.spacedBy(0.dp),
                    ) {
                        items(words, key = { it.id }) { word ->
                            TagDetailWordRow(word = word, speak = speak)
                            HorizontalDivider(
                                modifier = Modifier.padding(horizontal = 18.dp),
                                color = TagBorder,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TagDetailWordRow(
    word: Word,
    speak: (String) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 18.dp, vertical = 12.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    word.word,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF111827),
                )
                if (!word.phonetic.isNullOrBlank()) {
                    Text(word.phonetic, color = TagMuted, fontSize = 12.sp)
                }
            }
            IconButton(
                onClick = { speak(word.word) },
                modifier = Modifier.size(36.dp),
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.VolumeUp,
                    contentDescription = "朗读 ${word.word}",
                    modifier = Modifier.size(19.dp),
                    tint = TagIndigo,
                )
            }
        }
        Spacer(Modifier.height(4.dp))
        Text(
            word.definition,
            color = Color(0xFF334155),
            fontSize = 13.sp,
            lineHeight = 19.sp,
        )
        Spacer(Modifier.height(7.dp))
        Surface(
            shape = RoundedCornerShape(6.dp),
            color = Color(0xFFF8FAFC),
            border = BorderStroke(1.dp, TagBorder),
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Default.Folder,
                    contentDescription = null,
                    modifier = Modifier.size(11.dp),
                    tint = TagMuted,
                )
                Spacer(Modifier.width(4.dp))
                Text(
                    buildString {
                        append(word.textbookName)
                        word.groupName?.let { append(" > ").append(it) }
                    },
                    color = TagMuted,
                    fontSize = 10.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}
