package com.wordmind.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.AutoStories
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.RecordVoiceOver
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wordmind.app.data.PracticeWord
import com.wordmind.app.data.StudyPhonicsAnalysis
import com.wordmind.app.data.StudyPhonicsBlock
import com.wordmind.app.data.StudyPhonicsPattern
import com.wordmind.app.data.Tag
import com.wordmind.app.data.Word

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun TodayStudyMode(
    words: List<PracticeWord>,
    catalogWords: List<Word>,
    speak: (String) -> Unit,
    onBack: () -> Unit,
) {
    var index by rememberSaveable { mutableIntStateOf(0) }
    var selectedTag by remember { mutableStateOf<Tag?>(null) }
    val current = words.getOrNull(index)

    if (current == null) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text("暂无今日练习单词", color = PracticeMuted)
            Spacer(Modifier.height(12.dp))
            OutlinedButton(onClick = onBack) {
                Text("返回拼写页")
            }
        }
        return
    }

    LaunchedEffect(current.id) {
        autoSpeakPracticeWordTwice(current.word, speak)
    }

    val phonics = remember(current.id, current.phonics) {
        current.phonics.takeIf { it.blocks.isNotEmpty() }
            ?: analyzeNativeStudyPhonics(current.word)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 28.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "返回拼写页",
                )
            }
            Column(Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text("今日顺序学习", color = PracticeMuted, fontSize = 12.sp)
                    Text("${index + 1} / ${words.size}", color = PracticeMuted, fontSize = 12.sp)
                }
                Spacer(Modifier.height(6.dp))
                LinearProgressIndicator(
                    progress = { (index + 1).toFloat() / words.size.coerceAtLeast(1) },
                    modifier = Modifier.fillMaxWidth(),
                    color = PracticeIndigo,
                    trackColor = Color(0xFFE0E7FF),
                )
            }
        }
        Spacer(Modifier.height(12.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = PracticeIndigo),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 17.dp, vertical = 17.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        current.word,
                        color = Color.White,
                        fontSize = 30.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.width(8.dp))
                    Surface(
                        onClick = { speak(current.word) },
                        color = Color.White.copy(alpha = 0.14f),
                        shape = CircleShape,
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.VolumeUp,
                            contentDescription = "朗读 ${current.word}",
                            tint = Color.White,
                            modifier = Modifier
                                .padding(10.dp)
                                .size(21.dp),
                        )
                    }
                }
                current.phonetic?.takeIf { it.isNotBlank() }?.let { phonetic ->
                    Spacer(Modifier.height(3.dp))
                    Text(
                        phonetic,
                        color = Color(0xFFE0E7FF),
                        fontFamily = FontFamily.Monospace,
                        fontSize = 13.sp,
                    )
                }
                Spacer(Modifier.height(9.dp))
                Text(
                    current.definition,
                    color = Color.White,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium,
                )
                current.example?.takeIf { it.isNotBlank() }?.let { example ->
                    Spacer(Modifier.height(11.dp))
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = Color.White.copy(alpha = 0.10f),
                        shape = RoundedCornerShape(11.dp),
                    ) {
                        Column(Modifier.padding(horizontal = 11.dp, vertical = 9.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    "课本例句",
                                    modifier = Modifier.weight(1f),
                                    color = Color(0xFFC7D2FE),
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                Surface(
                                    onClick = { speak(example) },
                                    color = Color.White.copy(alpha = 0.14f),
                                    shape = RoundedCornerShape(7.dp),
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Icon(
                                            Icons.Default.RecordVoiceOver,
                                            contentDescription = null,
                                            tint = Color.White,
                                            modifier = Modifier.size(14.dp),
                                        )
                                        Spacer(Modifier.width(4.dp))
                                        Text("朗读", color = Color.White, fontSize = 9.sp)
                                    }
                                }
                            }
                            Spacer(Modifier.height(6.dp))
                            Text(
                                highlightStudyWord(
                                    example = example,
                                    word = current.word,
                                    highlightColor = Color(0xFFA7F3D0),
                                ),
                                modifier = Modifier.fillMaxWidth(),
                                color = Color.White,
                                fontSize = 13.sp,
                                lineHeight = 19.sp,
                            )
                        }
                    }
                }
                if (current.tags.isNotEmpty()) {
                    Spacer(Modifier.height(10.dp))
                    FlowRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(
                            6.dp,
                            alignment = Alignment.CenterHorizontally,
                        ),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        current.tags.forEach { tag ->
                            Surface(
                                onClick = { selectedTag = tag },
                                color = Color.White.copy(alpha = 0.14f),
                                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.22f)),
                                shape = RoundedCornerShape(100.dp),
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Icon(
                                        Icons.Default.LocalOffer,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(12.dp),
                                    )
                                    Spacer(Modifier.width(4.dp))
                                    Text(
                                        tag.name,
                                        color = Color.White,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
        Spacer(Modifier.height(12.dp))

        StudySection(
            title = "自然拼读拆分",
            icon = {
                Icon(
                    Icons.Default.AutoStories,
                    contentDescription = null,
                    tint = PracticeAmber,
                    modifier = Modifier.size(18.dp),
                )
            },
        ) {
            Text(
                "先看音节，再把常见字母组合当作一个发音单位，由慢到快合并拼读。",
                color = Color(0xFF94A3B8),
                fontSize = 11.sp,
            )
            Spacer(Modifier.height(13.dp))

            if (phonics.syllables.isNotEmpty()) {
                Text("音节", color = Color(0xFF94A3B8), fontSize = 10.sp)
                Spacer(Modifier.height(6.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(7.dp),
                    verticalArrangement = Arrangement.spacedBy(7.dp),
                ) {
                    phonics.syllables.forEach { syllable ->
                        Surface(
                            color = Color(0xFFF1F5F9),
                            shape = RoundedCornerShape(9.dp),
                        ) {
                            Text(
                                syllable,
                                modifier = Modifier.padding(horizontal = 11.dp, vertical = 6.dp),
                                color = Color(0xFF334155),
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }
                Spacer(Modifier.height(13.dp))
            }

            Text("字母块", color = Color(0xFF94A3B8), fontSize = 10.sp)
            Spacer(Modifier.height(6.dp))
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(7.dp),
            ) {
                phonics.blocks.forEach { block ->
                    PhonicsBlock(block)
                }
            }
            Spacer(Modifier.height(13.dp))

            if (phonics.patterns.isEmpty()) {
                Text(
                    "没有检测到固定字母组合，可以按上面的音节和单字母顺序依次拼读。",
                    color = PracticeMuted,
                    fontSize = 12.sp,
                )
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    phonics.patterns.forEach { pattern ->
                        Surface(
                            color = Color(0xFFFFFBEB),
                            border = BorderStroke(1.dp, Color(0xFFFDE68A)),
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Column(Modifier.padding(11.dp)) {
                                Text(
                                    pattern.text,
                                    color = Color(0xFF92400E),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                )
                                Spacer(Modifier.height(3.dp))
                                Text(
                                    pattern.explanation,
                                    color = Color(0xFFB45309),
                                    fontSize = 11.sp,
                                )
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(10.dp))
            Text(
                "自然拼读是常见规律；遇到不规则单词时，请以音标和实际发音为准。",
                color = Color(0xFF94A3B8),
                fontSize = 10.sp,
            )
        }

        current.notes?.takeIf { it.isNotBlank() }?.let { notes ->
            Spacer(Modifier.height(12.dp))
            StudySection(title = "备注") {
                Text(notes, color = PracticeMuted, fontSize = 13.sp, lineHeight = 20.sp)
            }
        }

        Spacer(Modifier.height(16.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            OutlinedButton(
                onClick = { index = (index - 1).coerceAtLeast(0) },
                enabled = index > 0,
                modifier = Modifier.weight(1f),
            ) {
                Icon(Icons.Default.ChevronLeft, contentDescription = null)
                Spacer(Modifier.width(4.dp))
                Text("上一个")
            }
            Button(
                onClick = {
                    if (index < words.lastIndex) {
                        index += 1
                    } else {
                        onBack()
                    }
                },
                modifier = Modifier.weight(1f),
            ) {
                Text(if (index < words.lastIndex) "下一个" else "完成学习")
                if (index < words.lastIndex) {
                    Spacer(Modifier.width(4.dp))
                    Icon(Icons.Default.ChevronRight, contentDescription = null)
                }
            }
        }
    }

    selectedTag?.let { tag ->
        NativeTagDetailDialog(
            tag = tag,
            words = catalogWords.filter { word ->
                word.tags.any { wordTag -> wordTag.id == tag.id }
            },
            speak = speak,
            onDismiss = { selectedTag = null },
        )
    }
}

@Composable
private fun StudySection(
    title: String,
    icon: (@Composable () -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                icon?.invoke()
                if (icon != null) Spacer(Modifier.width(7.dp))
                Text(
                    title,
                    color = Color(0xFF1E293B),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
            Spacer(Modifier.height(11.dp))
            content()
        }
    }
}

@Composable
private fun PhonicsBlock(block: StudyPhonicsBlock) {
    val colors = when (block.comboType) {
        "vowel_combo" -> Color(0xFFFEF3C7) to Color(0xFFB45309)
        "consonant_blend" -> Color(0xFFE0E7FF) to Color(0xFF4338CA)
        "magic_e" -> Color(0xFFFCE7F3) to Color(0xFFBE185D)
        "separator" -> Color.Transparent to Color(0xFF94A3B8)
        else -> Color(0xFFF8FAFC) to Color(0xFF334155)
    }
    Surface(
        color = colors.first,
        border = if (block.comboType == "separator") {
            null
        } else {
            BorderStroke(1.dp, colors.second.copy(alpha = 0.25f))
        },
        shape = RoundedCornerShape(10.dp),
    ) {
        Text(
            if (block.letters == " ") "·" else block.letters,
            modifier = Modifier.padding(horizontal = 11.dp, vertical = 7.dp),
            color = colors.second,
            fontSize = 17.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

private fun analyzeNativeStudyPhonics(word: String): StudyPhonicsAnalysis {
    val combinations = listOf(
        "igh", "ai", "ay", "ea", "ee", "ie", "oa", "oo", "ou", "ow",
        "oi", "oy", "au", "aw", "ew", "ue", "ui", "ar", "er", "ir", "or", "ur",
        "bl", "br", "cl", "cr", "dr", "fr", "tr", "pr", "gl", "gr", "pl", "sl",
        "sm", "sn", "sp", "st", "sw", "sc", "sk", "tw", "wh", "ch", "sh", "th",
        "ph", "ck", "ng",
    )
    val vowelCombos = setOf(
        "igh", "ai", "ay", "ea", "ee", "ie", "oa", "oo", "ou", "ow",
        "oi", "oy", "au", "aw", "ew", "ue", "ui", "ar", "er", "ir", "or", "ur",
    )
    val lower = word.lowercase()
    val blocks = buildList {
        var cursor = 0
        while (cursor < lower.length) {
            val character = lower[cursor]
            if (!character.isLetter()) {
                add(StudyPhonicsBlock(character.toString(), "separator", false))
                cursor += 1
                continue
            }
            val combination = combinations.firstOrNull { lower.startsWith(it, cursor) }
            if (combination != null) {
                add(
                    StudyPhonicsBlock(
                        letters = combination,
                        comboType = if (combination in vowelCombos) {
                            "vowel_combo"
                        } else {
                            "consonant_blend"
                        },
                        isCombo = true,
                    )
                )
                cursor += combination.length
            } else {
                add(StudyPhonicsBlock(character.toString(), null, false))
                cursor += 1
            }
        }
    }
    val patterns = blocks
        .filter { it.isCombo }
        .distinctBy { it.letters to it.comboType }
        .map { block ->
            StudyPhonicsPattern(
                type = block.comboType.orEmpty(),
                text = block.letters,
                explanation = if (block.comboType == "vowel_combo") {
                    "这是常见元音组合，拼读时把 ${block.letters} 看作一个发音单位。"
                } else {
                    "这是常见辅音组合，拼读时让相邻辅音自然连读。"
                },
            )
        }
    val syllables = lower
        .split(Regex("[^a-z]+"))
        .filter { it.isNotBlank() }
        .ifEmpty { listOf(lower) }
    return StudyPhonicsAnalysis(
        syllables = syllables,
        blocks = blocks,
        patterns = patterns,
    )
}

private fun highlightStudyWord(
    example: String,
    word: String,
    highlightColor: Color = Color(0xFF059669),
): AnnotatedString {
    if (word.isBlank()) return AnnotatedString(example)
    val lowerExample = example.lowercase()
    val lowerWord = word.lowercase()
    return buildAnnotatedString {
        var cursor = 0
        while (cursor < example.length) {
            val match = lowerExample.indexOf(lowerWord, cursor)
            if (match < 0) {
                append(example.substring(cursor))
                break
            }
            append(example.substring(cursor, match))
            withStyle(
                SpanStyle(
                    color = highlightColor,
                    fontWeight = FontWeight.Bold,
                )
            ) {
                append(example.substring(match, match + word.length))
            }
            cursor = match + word.length
        }
    }
}
