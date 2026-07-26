package com.wordmind.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Label
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.wordmind.app.data.Tag
import com.wordmind.app.data.Word
import java.text.Collator
import java.util.Locale

private val PhonicsIndigo = Color(0xFF4F46E5)
private val PhonicsEmerald = Color(0xFF059669)
private val PhonicsText = Color(0xFF0F172A)
private val PhonicsMuted = Color(0xFF64748B)
private val PhonicsBorder = Color(0xFFE2E8F0)

@Composable
internal fun PhonicsScreen(
    tags: List<Tag>,
    words: List<Word>,
    speak: (String) -> Unit,
    onSecondaryPageChanged: (Boolean) -> Unit,
) {
    var view by rememberSaveable { mutableStateOf("home") }
    var selectedTag by remember { mutableStateOf<Tag?>(null) }
    var selectedPhoneme by remember { mutableStateOf<Phoneme?>(null) }

    LaunchedEffect(view) {
        onSecondaryPageChanged(view != "home")
    }

    when (view) {
        "letters" -> LetterCombinationsScreen(
            tags = tags,
            onBack = { view = "home" },
            onOpenTag = { selectedTag = it },
        )
        "ipa" -> IpaLibraryScreen(
            onBack = { view = "home" },
            onOpen = {
                selectedPhoneme = it
                speak(it.exampleWord)
            },
        )
        else -> PhonicsHomeScreen(
            onOpenLetters = { view = "letters" },
            onOpenIpa = { view = "ipa" },
        )
    }

    selectedTag?.let { tag ->
        NativeTagDetailDialog(
            tag = tag,
            words = words.filter { word -> word.tags.any { it.id == tag.id } },
            speak = speak,
            onDismiss = { selectedTag = null },
        )
    }

    selectedPhoneme?.let { phoneme ->
        PhonemeDetailDialog(
            phoneme = phoneme,
            speak = speak,
            onDismiss = { selectedPhoneme = null },
        )
    }
}

@Composable
private fun PhonicsHomeScreen(
    onOpenLetters: () -> Unit,
    onOpenIpa: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Text(
                "PHONICS",
                color = PhonicsIndigo,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.sp,
            )
            Text("拼读", color = PhonicsText, fontSize = 25.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            Text(
                "从字母组合认识拼写规律，再用音标看清每一个英语发音。",
                color = PhonicsMuted,
                fontSize = 14.sp,
                lineHeight = 21.sp,
            )
        }
        item {
            PhonicsEntryCard(
                title = "字母组合",
                eyebrow = "LETTER PATTERNS",
                description = "查看现有标签及其关联单词，按字母顺序排列。",
                iconTint = PhonicsEmerald,
                iconBackground = Color(0xFFECFDF5),
                icon = {
                    Icon(
                        Icons.AutoMirrored.Filled.Label,
                        contentDescription = null,
                        tint = PhonicsEmerald,
                    )
                },
                onClick = onOpenLetters,
            )
        }
        item {
            PhonicsEntryCard(
                title = "音标",
                eyebrow = "IPA SOUNDS",
                description = "学习短元音、长元音、双元音和 24 个辅音。",
                iconTint = PhonicsIndigo,
                iconBackground = Color(0xFFEEF2FF),
                icon = {
                    Icon(
                        Icons.Default.GraphicEq,
                        contentDescription = null,
                        tint = PhonicsIndigo,
                    )
                },
                onClick = onOpenIpa,
            )
        }
        item {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Color(0xFFEEF2FF),
                border = BorderStroke(1.dp, Color(0xFFC7D2FE)),
            ) {
                Text(
                    "音标页采用常见英式 44 音体系。点击任一音标会播放示例词，设备音色可能略有差异。",
                    modifier = Modifier.padding(15.dp),
                    color = Color(0xFF3730A3),
                    fontSize = 13.sp,
                    lineHeight = 20.sp,
                )
            }
        }
    }
}

@Composable
private fun PhonicsEntryCard(
    title: String,
    eyebrow: String,
    description: String,
    iconTint: Color,
    iconBackground: Color,
    icon: @Composable () -> Unit,
    onClick: () -> Unit,
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, PhonicsBorder),
    ) {
        Row(
            modifier = Modifier.padding(18.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(
                modifier = Modifier.size(50.dp),
                shape = RoundedCornerShape(14.dp),
                color = iconBackground,
            ) {
                Box(contentAlignment = Alignment.Center) { icon() }
            }
            Spacer(Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    eyebrow,
                    color = iconTint,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.4.sp,
                )
                Text(title, color = PhonicsText, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(3.dp))
                Text(
                    description,
                    color = PhonicsMuted,
                    fontSize = 12.sp,
                    lineHeight = 18.sp,
                )
            }
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = PhonicsMuted)
        }
    }
}

@Composable
private fun PhonicsSectionHeader(
    title: String,
    subtitle: String,
    onBack: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top,
    ) {
        Surface(
            modifier = Modifier
                .size(40.dp)
                .clickable(onClick = onBack),
            shape = RoundedCornerShape(12.dp),
            color = Color.White,
            border = BorderStroke(1.dp, PhonicsBorder),
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "返回拼读首页",
                    tint = PhonicsMuted,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(title, color = PhonicsText, fontSize = 21.sp, fontWeight = FontWeight.Bold)
            Text(subtitle, color = PhonicsMuted, fontSize = 12.sp, lineHeight = 18.sp)
        }
    }
}

@Composable
private fun LetterCombinationsScreen(
    tags: List<Tag>,
    onBack: () -> Unit,
    onOpenTag: (Tag) -> Unit,
) {
    val collator = remember {
        Collator.getInstance(Locale.ENGLISH).apply { strength = Collator.PRIMARY }
    }
    val sortedTags = remember(tags) { tags.sortedWith { left, right -> collator.compare(left.name, right.name) } }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = 18.dp),
    ) {
        Box(modifier = Modifier.padding(horizontal = 18.dp)) {
            PhonicsSectionHeader(
                title = "字母组合",
                subtitle = "现有标签按英文字母顺序排列，点击可查看说明和关联单词。",
                onBack = onBack,
            )
        }
        Spacer(Modifier.height(16.dp))
        if (sortedTags.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("暂无字母组合", color = PhonicsMuted)
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 92.dp),
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 18.dp, end = 18.dp, bottom = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(sortedTags, key = { it.id }) { tag ->
                    Card(
                        onClick = { onOpenTag(tag) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(13.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = BorderStroke(1.dp, PhonicsBorder),
                    ) {
                        Column(modifier = Modifier.padding(horizontal = 11.dp, vertical = 10.dp)) {
                            Text(
                                tag.name,
                                color = PhonicsText,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Spacer(Modifier.height(4.dp))
                            Text("${tag.wordCount} 个单词", color = PhonicsMuted, fontSize = 10.sp)
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun IpaLibraryScreen(
    onBack: () -> Unit,
    onOpen: (Phoneme) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            PhonicsSectionHeader(
                title = "英语音标",
                subtitle = "点击音标试听示例词，并查看发音要领和常见拼写。",
                onBack = onBack,
            )
        }
        item {
            Text("元音", color = PhonicsText, fontSize = 17.sp, fontWeight = FontWeight.Bold)
            Text(
                "单元音包含短元音和长元音，双元音带有口形滑动。",
                color = PhonicsMuted,
                fontSize = 11.sp,
            )
        }
        items(
            PhonemeSection.entries.filter { it != PhonemeSection.Consonant },
            key = { it.name },
        ) { section ->
            PhonemeSectionCard(section = section, onOpen = onOpen)
        }
        item {
            Text("辅音", color = PhonicsText, fontSize = 17.sp, fontWeight = FontWeight.Bold)
            Text("注意清辅音与浊辅音的声带振动差别。", color = PhonicsMuted, fontSize = 11.sp)
        }
        item {
            PhonemeSectionCard(section = PhonemeSection.Consonant, onOpen = onOpen)
        }
        item {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFFF1F5F9),
            ) {
                Text(
                    "分类参考 IPA、BBC Sounds of English 与 Cambridge pronunciation symbols。",
                    modifier = Modifier.padding(13.dp),
                    color = PhonicsMuted,
                    fontSize = 11.sp,
                    lineHeight = 17.sp,
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PhonemeSectionCard(
    section: PhonemeSection,
    onOpen: (Phoneme) -> Unit,
) {
    val phonemes = remember(section) { EnglishPhonemes.filter { it.section == section } }
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(17.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, PhonicsBorder),
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(section.label, color = PhonicsText, fontSize = 15.sp, fontWeight = FontWeight.Bold)
            Text(section.description, color = PhonicsMuted, fontSize = 10.sp, lineHeight = 15.sp)
            Spacer(Modifier.height(11.dp))
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                maxItemsInEachRow = if (section == PhonemeSection.Consonant) 4 else 4,
            ) {
                phonemes.forEach { phoneme ->
                    Surface(
                        modifier = Modifier
                            .width(if (section == PhonemeSection.Consonant) 68.dp else 68.dp)
                            .clickable { onOpen(phoneme) },
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFF8FAFC),
                        border = BorderStroke(1.dp, PhonicsBorder),
                    ) {
                        Column(
                            modifier = Modifier.padding(horizontal = 5.dp, vertical = 9.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text(
                                "/${phoneme.symbol}/",
                                color = PhonicsText,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.SemiBold,
                                fontFamily = FontFamily.Serif,
                            )
                            Text(
                                phoneme.exampleWord,
                                color = PhonicsMuted,
                                fontSize = 9.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PhonemeDetailDialog(
    phoneme: Phoneme,
    speak: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.82f),
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
        ) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(18.dp),
                verticalArrangement = Arrangement.spacedBy(15.dp),
            ) {
                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = Color(0xFFEEF2FF),
                        ) {
                            Text(
                                "/${phoneme.symbol}/",
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 13.dp),
                                color = PhonicsIndigo,
                                fontSize = 29.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Serif,
                            )
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                phoneme.section.label,
                                color = PhonicsText,
                                fontSize = 17.sp,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(phoneme.soundType, color = PhonicsMuted, fontSize = 12.sp)
                        }
                        IconButton(onClick = onDismiss) {
                            Icon(Icons.Default.Close, contentDescription = "关闭")
                        }
                    }
                }
                item {
                    Surface(
                        shape = RoundedCornerShape(13.dp),
                        color = Color(0xFFF8FAFC),
                    ) {
                        Column(modifier = Modifier.padding(13.dp)) {
                            Text("发音要领", color = PhonicsMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            Spacer(Modifier.height(4.dp))
                            Text(
                                phoneme.tip,
                                color = Color(0xFF334155),
                                fontSize = 14.sp,
                                lineHeight = 21.sp,
                            )
                        }
                    }
                }
                item {
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { speak(phoneme.exampleWord) },
                        shape = RoundedCornerShape(14.dp),
                        color = Color(0xFFEEF2FF),
                        border = BorderStroke(1.dp, Color(0xFFC7D2FE)),
                    ) {
                        Row(
                            modifier = Modifier.padding(13.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Surface(
                                modifier = Modifier.size(44.dp),
                                shape = CircleShape,
                                color = PhonicsIndigo,
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        Icons.AutoMirrored.Filled.VolumeUp,
                                        contentDescription = "播放 ${phoneme.exampleWord}",
                                        tint = Color.White,
                                    )
                                }
                            }
                            Spacer(Modifier.width(11.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.Bottom) {
                                    Text(
                                        phoneme.exampleWord,
                                        color = PhonicsText,
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Bold,
                                    )
                                    Spacer(Modifier.width(7.dp))
                                    Text(phoneme.examplePhonetic, color = PhonicsMuted, fontSize = 12.sp)
                                }
                                Text(
                                    "${phoneme.exampleMeaning} · 点击播放英式发音",
                                    color = PhonicsMuted,
                                    fontSize = 11.sp,
                                )
                            }
                        }
                    }
                }
                item {
                    Text("常见拼写", color = PhonicsMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(7.dp))
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(7.dp),
                        verticalArrangement = Arrangement.spacedBy(7.dp),
                    ) {
                        phoneme.spellings.forEach { spelling ->
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFFECFDF5),
                            ) {
                                Text(
                                    spelling,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                    color = Color(0xFF047857),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                    }
                }
                item {
                    Text("更多例词", color = PhonicsMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(5.dp))
                    Text(
                        phoneme.moreExamples.joinToString(" · "),
                        color = Color(0xFF334155),
                        fontSize = 14.sp,
                    )
                }
            }
        }
    }
}
