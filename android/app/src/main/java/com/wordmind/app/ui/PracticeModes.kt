package com.wordmind.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Headphones
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Replay
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wordmind.app.data.PracticeWord
import kotlinx.coroutines.delay
import kotlin.math.ceil
import kotlin.math.floor

private typealias PracticeSubmit = (
    word: PracticeWord,
    correct: Boolean,
    input: String,
    mode: String,
    durationMs: Long,
) -> Unit

private data class LetterToken(
    val id: Int,
    val letter: Char,
)

internal data class SessionWordResult(
    val word: String,
    val correct: Boolean,
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun BlocksPracticeMode(
    words: List<PracticeWord>,
    speak: (String) -> Unit,
    onBack: () -> Unit,
    onSubmit: PracticeSubmit,
) {
    var index by remember { mutableIntStateOf(0) }
    var pool by remember { mutableStateOf<List<LetterToken>>(emptyList()) }
    var slots by remember { mutableStateOf<List<Int?>>(emptyList()) }
    var result by remember { mutableStateOf<Boolean?>(null) }
    var score by remember { mutableIntStateOf(0) }
    var sessionResults by remember { mutableStateOf<List<SessionWordResult>>(emptyList()) }
    var showSummary by remember { mutableStateOf(false) }
    var retryToken by remember { mutableIntStateOf(0) }
    var startedAt by remember { mutableLongStateOf(System.currentTimeMillis()) }
    val current = words.getOrNull(index)
    val target = current?.let { practiceTarget(it.word) }.orEmpty()

    LaunchedEffect(current?.id, retryToken) {
        if (current != null) {
            pool = target.mapIndexed { tokenIndex, char ->
                LetterToken(tokenIndex, char)
            }.shuffled()
            slots = List(target.length) { null }
            result = null
            startedAt = System.currentTimeMillis()
        }
    }

    if (showSummary) {
        PracticeSessionSummary(
            results = sessionResults,
            score = score,
            total = words.size,
            onBack = onBack,
            onRetry = {
                index = 0
                score = 0
                sessionResults = emptyList()
                showSummary = false
                retryToken += 1
            },
        )
        return
    }
    if (current == null) {
        EmptyPracticeMode(onBack)
        return
    }

    val allFilled = slots.isNotEmpty() && slots.all { it != null }
    val answer = slots.mapNotNull { tokenId ->
        pool.firstOrNull { it.id == tokenId }?.letter
    }.joinToString("")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        PracticeModeHeader(
            index = index,
            total = words.size,
            score = score,
            scoreColor = PracticeIndigo,
            onBack = onBack,
        )
        Spacer(Modifier.height(12.dp))
        PracticePromptCard(
            word = current,
            speak = speak,
            accent = PracticeIndigo,
            result = result,
        )
        Spacer(Modifier.height(15.dp))

        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            slots.forEachIndexed { slotIndex, tokenId ->
                val token = pool.firstOrNull { it.id == tokenId }
                val correctAtPosition = token?.letter == target.getOrNull(slotIndex)
                LetterBox(
                    text = token?.letter?.toString().orEmpty(),
                    color = when {
                        result == true -> PracticeSuccess
                        result == false && correctAtPosition -> PracticeSuccess
                        result == false -> PracticeDanger
                        token != null -> PracticeIndigo
                        else -> Color(0xFFCBD5E1)
                    },
                    filled = token != null,
                    dashed = token == null,
                    onClick = {
                        if (result == null && tokenId != null) {
                            slots = slots.toMutableList().also { it[slotIndex] = null }
                        }
                    },
                )
                Spacer(Modifier.width(7.dp))
            }
        }
        Spacer(Modifier.height(22.dp))

        if (result == null) {
            Text(
                "点击字母积木，按顺序拼出单词",
                modifier = Modifier.fillMaxWidth(),
                color = PracticeMuted,
                fontSize = 12.sp,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(10.dp))
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                pool.forEach { token ->
                    val used = token.id in slots
                    LetterBox(
                        text = token.letter.toString(),
                        color = if (used) Color(0xFFCBD5E1) else PracticeIndigo,
                        filled = !used,
                        dashed = false,
                        enabled = !used,
                        onClick = {
                            val firstEmpty = slots.indexOfFirst { it == null }
                            if (firstEmpty >= 0) {
                                slots = slots.toMutableList().also {
                                    it[firstEmpty] = token.id
                                }
                            }
                        },
                    )
                    Spacer(Modifier.width(7.dp))
                }
            }
        } else {
            PracticeAnswerResult(
                correct = result == true,
                word = current,
                userInput = answer,
                accent = PracticeIndigo,
                speak = speak,
            )
        }
        Spacer(Modifier.height(18.dp))

        Button(
            onClick = {
                if (result == null) {
                    val correct = answer.equals(target, ignoreCase = true)
                    result = correct
                    if (correct) score += 1
                    sessionResults = sessionResults + SessionWordResult(current.word, correct)
                    onSubmit(
                        current,
                        correct,
                        answer,
                        "blocks",
                        System.currentTimeMillis() - startedAt,
                    )
                } else if (index < words.lastIndex) {
                    index += 1
                } else {
                    showSummary = true
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp),
            enabled = result != null || allFilled,
            shape = RoundedCornerShape(13.dp),
        ) {
            Text(
                when {
                    result == null -> "检查答案"
                    index < words.lastIndex -> "下一个"
                    else -> "查看结果"
                },
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun FillBlankPracticeMode(
    words: List<PracticeWord>,
    speak: (String) -> Unit,
    onBack: () -> Unit,
    onSubmit: PracticeSubmit,
) {
    var index by remember { mutableIntStateOf(0) }
    var hiddenPositions by remember { mutableStateOf<List<Int>>(emptyList()) }
    var answers by remember { mutableStateOf<Map<Int, Char>>(emptyMap()) }
    var activeBlankIndex by remember { mutableIntStateOf(0) }
    var result by remember { mutableStateOf<Boolean?>(null) }
    var score by remember { mutableIntStateOf(0) }
    var sessionResults by remember { mutableStateOf<List<SessionWordResult>>(emptyList()) }
    var showSummary by remember { mutableStateOf(false) }
    var retryToken by remember { mutableIntStateOf(0) }
    var startedAt by remember { mutableLongStateOf(System.currentTimeMillis()) }
    val current = words.getOrNull(index)
    val target = current?.let { practiceTarget(it.word) }.orEmpty()

    LaunchedEffect(current?.id, retryToken) {
        if (current != null) {
            hiddenPositions = fillBlankPositions(target)
            answers = emptyMap()
            activeBlankIndex = 0
            result = null
            startedAt = System.currentTimeMillis()
        }
    }

    if (showSummary) {
        PracticeSessionSummary(
            results = sessionResults,
            score = score,
            total = words.size,
            onBack = onBack,
            onRetry = {
                index = 0
                score = 0
                sessionResults = emptyList()
                showSummary = false
                retryToken += 1
            },
        )
        return
    }
    if (current == null) {
        EmptyPracticeMode(onBack)
        return
    }

    val activePosition = hiddenPositions.getOrNull(activeBlankIndex)
    val allFilled = hiddenPositions.isNotEmpty() && hiddenPositions.all { it in answers }
    val answer = target.mapIndexed { charIndex, char ->
        answers[charIndex] ?: char
    }.joinToString("")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        PracticeModeHeader(
            index = index,
            total = words.size,
            score = score,
            scoreColor = PracticeSuccess,
            onBack = onBack,
        )
        Spacer(Modifier.height(12.dp))
        PracticePromptCard(
            word = current,
            speak = speak,
            accent = PracticeSuccess,
        )
        Spacer(Modifier.height(14.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            border = CardDefaults.outlinedCardBorder(),
        ) {
            Column(Modifier.padding(14.dp)) {
                Text(
                    "点击虚线框，选择字母填入",
                    modifier = Modifier.fillMaxWidth(),
                    color = PracticeMuted,
                    fontSize = 11.sp,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(12.dp))
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalArrangement = Arrangement.spacedBy(7.dp),
                ) {
                    target.forEachIndexed { charIndex, char ->
                        val blankListIndex = hiddenPositions.indexOf(charIndex)
                        if (blankListIndex >= 0) {
                            val answerChar = answers[charIndex]
                            LetterBox(
                                text = answerChar?.toString() ?: "?",
                                color = when {
                                    result == true -> PracticeSuccess
                                    result == false && answerChar == char -> PracticeSuccess
                                    result == false -> PracticeDanger
                                    activePosition == charIndex -> PracticeSuccess
                                    else -> Color(0xFF6EE7B7)
                                },
                                filled = answerChar != null,
                                dashed = answerChar == null,
                                onClick = {
                                    if (result == null) activeBlankIndex = blankListIndex
                                },
                            )
                        } else {
                            LetterBox(
                                text = char.toString(),
                                color = Color(0xFF475569),
                                filled = true,
                                dashed = false,
                                enabled = false,
                                onClick = {},
                            )
                        }
                        Spacer(Modifier.width(5.dp))
                    }
                }
                Spacer(Modifier.height(9.dp))
                Text(
                    if (target.length > 1) {
                        "首字母 ${target.first()}，尾字母 ${target.last()}"
                    } else {
                        "填写缺失字母"
                    },
                    modifier = Modifier.fillMaxWidth(),
                    color = PracticeMuted,
                    fontSize = 10.sp,
                    textAlign = TextAlign.Center,
                )
            }
        }
        Spacer(Modifier.height(14.dp))

        if (result == null) {
            PracticeKeyboard(
                accent = PracticeSuccess,
                canSubmit = allFilled,
                onLetter = { letter ->
                    val position = activePosition ?: return@PracticeKeyboard
                    answers = answers + (position to letter)
                    if (activeBlankIndex < hiddenPositions.lastIndex) {
                        activeBlankIndex += 1
                    }
                },
                onDelete = {
                    val position = activePosition ?: return@PracticeKeyboard
                    if (position in answers) {
                        answers = answers - position
                    } else if (activeBlankIndex > 0) {
                        activeBlankIndex -= 1
                    }
                },
                onSubmit = {
                    val correct = answer.equals(target, ignoreCase = true)
                    result = correct
                    if (correct) score += 1
                    sessionResults = sessionResults + SessionWordResult(current.word, correct)
                    onSubmit(
                        current,
                        correct,
                        answer,
                        "fillblank",
                        System.currentTimeMillis() - startedAt,
                    )
                },
            )
        } else {
            PracticeAnswerResult(
                correct = result == true,
                word = current,
                userInput = answer,
                accent = PracticeSuccess,
                speak = speak,
            )
            Spacer(Modifier.height(14.dp))
            Button(
                onClick = {
                    if (index < words.lastIndex) {
                        index += 1
                    } else {
                        showSummary = true
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                shape = RoundedCornerShape(13.dp),
            ) {
                Text(if (index < words.lastIndex) "下一个" else "查看结果")
            }
        }
    }
}

private enum class FlashPhase {
    Show,
    Input,
    Result,
}

@Composable
internal fun FlashPracticeMode(
    words: List<PracticeWord>,
    speak: (String) -> Unit,
    onBack: () -> Unit,
    onSubmit: PracticeSubmit,
) {
    var index by remember { mutableIntStateOf(0) }
    var phase by remember { mutableStateOf(FlashPhase.Show) }
    var input by remember { mutableStateOf("") }
    var timeLeft by remember { mutableIntStateOf(3) }
    var score by remember { mutableIntStateOf(0) }
    var sessionResults by remember { mutableStateOf<List<SessionWordResult>>(emptyList()) }
    var showSummary by remember { mutableStateOf(false) }
    var retryToken by remember { mutableIntStateOf(0) }
    var startedAt by remember { mutableLongStateOf(System.currentTimeMillis()) }
    val current = words.getOrNull(index)
    val target = current?.let { practiceTarget(it.word) }.orEmpty()

    LaunchedEffect(current?.id, phase, retryToken) {
        if (current != null && phase == FlashPhase.Show) {
            startedAt = System.currentTimeMillis()
            input = ""
            timeLeft = 3
            speak(current.word)
            repeat(3) {
                delay(1_000)
                timeLeft = (timeLeft - 1).coerceAtLeast(0)
            }
            phase = FlashPhase.Input
        }
    }

    if (showSummary) {
        PracticeSessionSummary(
            results = sessionResults,
            score = score,
            total = words.size,
            onBack = onBack,
            onRetry = {
                index = 0
                score = 0
                sessionResults = emptyList()
                showSummary = false
                phase = FlashPhase.Show
                retryToken += 1
            },
        )
        return
    }
    if (current == null) {
        EmptyPracticeMode(onBack)
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        PracticeModeHeader(
            index = index,
            total = words.size,
            score = score,
            scoreColor = PracticeAmber,
            onBack = onBack,
        )
        Spacer(Modifier.height(12.dp))

        when (phase) {
            FlashPhase.Show -> {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    border = CardDefaults.outlinedCardBorder(),
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 22.dp, vertical = 30.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text("记住这个单词！", color = PracticeMuted, fontSize = 13.sp)
                        Spacer(Modifier.height(12.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(current.word, fontSize = 30.sp, fontWeight = FontWeight.Bold)
                            IconButton(onClick = { speak(current.word) }) {
                                Icon(
                                    Icons.AutoMirrored.Filled.VolumeUp,
                                    contentDescription = "重听发音",
                                    tint = PracticeAmber,
                                )
                            }
                        }
                        current.phonetic?.let {
                            Text(it, color = PracticeMuted, fontSize = 12.sp)
                        }
                        Spacer(Modifier.height(9.dp))
                        Text(
                            current.definition,
                            color = Color(0xFF475569),
                            fontSize = 14.sp,
                            textAlign = TextAlign.Center,
                        )
                        Spacer(Modifier.height(20.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.AccessTime,
                                contentDescription = null,
                                tint = PracticeAmber,
                            )
                            Spacer(Modifier.width(7.dp))
                            Text(
                                "$timeLeft",
                                color = PracticeAmber,
                                fontSize = 25.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }
            }
            FlashPhase.Input -> {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(15.dp),
                    color = Color(0xFFFFFBEB),
                    border = BorderStroke(1.dp, Color(0xFFFDE68A)),
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Icon(
                            Icons.Default.Lightbulb,
                            contentDescription = null,
                            tint = PracticeAmber,
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(
                            current.definition,
                            color = Color(0xFFB45309),
                            fontSize = 13.sp,
                            textAlign = TextAlign.Center,
                        )
                    }
                }
                Spacer(Modifier.height(18.dp))
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(58.dp),
                    shape = RoundedCornerShape(14.dp),
                    color = Color.White,
                    border = BorderStroke(2.dp, Color(0xFFFCD34D)),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            input.ifBlank { "点击键盘输入单词" },
                            color = if (input.isBlank()) Color(0xFFCBD5E1) else Color(0xFF0F172A),
                            fontSize = if (input.isBlank()) 13.sp else 21.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = if (input.isBlank()) 0.sp else 4.sp,
                        )
                    }
                }
                Spacer(Modifier.height(16.dp))
                PracticeKeyboard(
                    accent = PracticeAmber,
                    canSubmit = input.isNotBlank(),
                    onLetter = { input += it },
                    onDelete = { input = input.dropLast(1) },
                    onSubmit = {
                        val correct = input.equals(target, ignoreCase = true)
                        phase = FlashPhase.Result
                        if (correct) score += 1
                        sessionResults = sessionResults + SessionWordResult(current.word, correct)
                        onSubmit(
                            current,
                            correct,
                            input,
                            "flash",
                            System.currentTimeMillis() - startedAt,
                        )
                    },
                )
            }
            FlashPhase.Result -> {
                PracticeAnswerResult(
                    correct = input.equals(target, ignoreCase = true),
                    word = current,
                    userInput = input,
                    accent = PracticeAmber,
                    speak = speak,
                )
                Spacer(Modifier.height(14.dp))
                Button(
                    onClick = {
                        if (index < words.lastIndex) {
                            index += 1
                            phase = FlashPhase.Show
                        } else {
                            showSummary = true
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(13.dp),
                ) {
                    Text(if (index < words.lastIndex) "下一个" else "查看结果")
                }
            }
        }
    }
}

private enum class DictationPhase {
    Idle,
    Playing,
    Paused,
    Done,
}

@Composable
internal fun DictationPracticeMode(
    words: List<PracticeWord>,
    speak: (String) -> Unit,
    onBack: () -> Unit,
) {
    var phase by remember { mutableStateOf(DictationPhase.Idle) }
    var index by remember { mutableIntStateOf(0) }
    var showAnswers by remember { mutableStateOf(false) }
    val current = words.getOrNull(index)

    LaunchedEffect(phase, index) {
        if (phase == DictationPhase.Playing && current != null) {
            val waitTime = dictationWaitTime(current.word)
            speak(current.word)
            delay(waitTime + 800L)
            speak(current.word)
            delay(waitTime)
            if (index < words.lastIndex) {
                index += 1
            } else {
                phase = DictationPhase.Done
            }
        }
    }

    if (words.isEmpty()) {
        EmptyPracticeMode(onBack)
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
            }
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Headphones,
                        contentDescription = null,
                        tint = PracticePurple,
                        modifier = Modifier.size(21.dp),
                    )
                    Spacer(Modifier.width(7.dp))
                    Text("听写模式", fontSize = 19.sp, fontWeight = FontWeight.Bold)
                }
                Text("${words.size} 个单词 · 每个读两遍", color = PracticeMuted, fontSize = 11.sp)
            }
        }
        Spacer(Modifier.height(18.dp))
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(17.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            border = CardDefaults.outlinedCardBorder(),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 22.dp, vertical = 28.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                when (phase) {
                    DictationPhase.Idle -> {
                        Icon(
                            Icons.Default.Headphones,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = Color(0xFFE9D5FF),
                        )
                        Spacer(Modifier.height(12.dp))
                        Text("准备听写", fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(5.dp))
                        Text(
                            "请准备好纸笔，听音频写出单词",
                            color = PracticeMuted,
                            fontSize = 13.sp,
                            textAlign = TextAlign.Center,
                        )
                        Spacer(Modifier.height(22.dp))
                        Button(
                            onClick = {
                                index = 0
                                showAnswers = false
                                phase = DictationPhase.Playing
                            },
                        ) {
                            Icon(Icons.Default.PlayArrow, contentDescription = null)
                            Spacer(Modifier.width(6.dp))
                            Text("开始听写")
                        }
                    }
                    DictationPhase.Playing -> {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text("第 ${index + 1} / ${words.size} 个", color = PracticeMuted, fontSize = 11.sp)
                            Text("请写下你听到的单词", color = PracticePurple, fontSize = 11.sp)
                        }
                        Spacer(Modifier.height(12.dp))
                        LinearProgressIndicator(
                            progress = { index.toFloat() / words.size.coerceAtLeast(1) },
                            modifier = Modifier.fillMaxWidth(),
                            color = PracticePurple,
                            trackColor = Color(0xFFF1F5F9),
                        )
                        Spacer(Modifier.height(25.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = PracticePurple,
                                strokeWidth = 2.dp,
                            )
                            Spacer(Modifier.width(9.dp))
                            Text("正在播放...", color = PracticePurple, fontSize = 14.sp)
                        }
                        Spacer(Modifier.height(22.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedButton(onClick = { phase = DictationPhase.Paused }) {
                                Icon(
                                    Icons.Default.Pause,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp),
                                )
                                Spacer(Modifier.width(5.dp))
                                Text("暂停")
                            }
                            OutlinedButton(
                                onClick = {
                                    if (index < words.lastIndex) {
                                        index += 1
                                    } else {
                                        phase = DictationPhase.Done
                                    }
                                },
                            ) {
                                Icon(
                                    Icons.Default.SkipNext,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp),
                                )
                                Spacer(Modifier.width(5.dp))
                                Text("跳过")
                            }
                        }
                    }
                    DictationPhase.Paused -> {
                        Icon(
                            Icons.Default.Pause,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = Color(0xFFFDE68A),
                        )
                        Spacer(Modifier.height(12.dp))
                        Text("已暂停", fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(5.dp))
                        Text(
                            "已暂停 · 第 ${index + 1} / ${words.size} 个",
                            color = PracticeMuted,
                            fontSize = 13.sp,
                        )
                        Spacer(Modifier.height(18.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Button(onClick = { phase = DictationPhase.Playing }) {
                                Icon(
                                    Icons.Default.PlayArrow,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp),
                                )
                                Spacer(Modifier.width(5.dp))
                                Text("继续")
                            }
                            OutlinedButton(onClick = onBack) {
                                Text("结束")
                            }
                        }
                    }
                    DictationPhase.Done -> {
                        Surface(
                            modifier = Modifier.size(66.dp),
                            shape = CircleShape,
                            color = Color(0xFFECFDF5),
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.Headphones,
                                    contentDescription = null,
                                    tint = PracticeSuccess,
                                    modifier = Modifier.size(34.dp),
                                )
                            }
                        }
                        Spacer(Modifier.height(12.dp))
                        Text("听写完成！", fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(4.dp))
                        Text("共 ${words.size} 个单词", color = PracticeMuted, fontSize = 13.sp)
                        Spacer(Modifier.height(17.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedButton(onClick = onBack) {
                                Icon(
                                    Icons.AutoMirrored.Filled.ArrowBack,
                                    contentDescription = null,
                                    modifier = Modifier.size(17.dp),
                                )
                                Spacer(Modifier.width(5.dp))
                                Text("返回")
                            }
                            Button(
                                onClick = {
                                    index = 0
                                    showAnswers = false
                                    phase = DictationPhase.Playing
                                },
                            ) {
                                Icon(
                                    Icons.Default.Replay,
                                    contentDescription = null,
                                    modifier = Modifier.size(17.dp),
                                )
                                Spacer(Modifier.width(5.dp))
                                Text("再来一遍")
                            }
                        }
                        Spacer(Modifier.height(10.dp))
                        OutlinedButton(onClick = { showAnswers = !showAnswers }) {
                            Text(if (showAnswers) "隐藏答案" else "查看单词列表")
                        }
                    }
                }
            }
        }

        if (phase == DictationPhase.Done && showAnswers) {
            Spacer(Modifier.height(14.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = CardDefaults.outlinedCardBorder(),
            ) {
                Column(Modifier.padding(14.dp)) {
                    Text("单词列表", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(9.dp))
                    words.forEachIndexed { wordIndex, word ->
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 3.dp),
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFFF8FAFC),
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text("${wordIndex + 1}", color = PracticeMuted, fontSize = 10.sp)
                                Spacer(Modifier.width(10.dp))
                                Text(
                                    word.word,
                                    modifier = Modifier.weight(1f),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                Text(
                                    word.definition,
                                    modifier = Modifier.weight(1.4f),
                                    color = PracticeMuted,
                                    fontSize = 10.sp,
                                    maxLines = 1,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PracticeModeHeader(
    index: Int,
    total: Int,
    score: Int,
    scoreColor: Color,
    onBack: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
        }
        Surface(
            shape = RoundedCornerShape(8.dp),
            color = Color(0xFFF1F5F9),
        ) {
            Text(
                "${index + 1} / $total",
                modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp),
                color = PracticeMuted,
                fontSize = 11.sp,
            )
        }
        Spacer(Modifier.weight(1f))
        Text("$score 分", color = scoreColor, fontSize = 14.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun PracticePromptCard(
    word: PracticeWord,
    speak: (String) -> Unit,
    accent: Color,
    result: Boolean? = null,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = CardDefaults.outlinedCardBorder(),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(15.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            OutlinedButton(
                onClick = { speak(word.word) },
                contentPadding = PaddingValues(horizontal = 11.dp, vertical = 4.dp),
                border = BorderStroke(1.dp, accent.copy(alpha = 0.35f)),
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.VolumeUp,
                    contentDescription = null,
                    tint = accent,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.width(5.dp))
                Text("听发音", color = accent, fontSize = 11.sp)
            }
            Spacer(Modifier.height(8.dp))
            Text(
                word.definition,
                color = Color(0xFF475569),
                fontSize = 14.sp,
                textAlign = TextAlign.Center,
                lineHeight = 21.sp,
            )
            if (result != null && !word.example.isNullOrBlank()) {
                Spacer(Modifier.height(11.dp))
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    color = accent.copy(alpha = 0.08f),
                ) {
                    Column(Modifier.padding(10.dp)) {
                        Text("例句", color = accent, fontSize = 10.sp, fontWeight = FontWeight.Medium)
                        Spacer(Modifier.height(3.dp))
                        Text(word.example, color = Color(0xFF475569), fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun PracticeAnswerResult(
    correct: Boolean,
    word: PracticeWord,
    userInput: String,
    accent: Color,
    speak: (String) -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(15.dp),
        color = if (correct) Color(0xFFECFDF5) else Color(0xFFFEF2F2),
        border = BorderStroke(
            1.dp,
            if (correct) Color(0xFFA7F3D0) else Color(0xFFFECACA),
        ),
    ) {
        Column(Modifier.padding(15.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    if (correct) Icons.Default.CheckCircle else Icons.Default.Close,
                    contentDescription = null,
                    tint = if (correct) PracticeSuccess else PracticeDanger,
                )
                Spacer(Modifier.width(7.dp))
                Text(
                    if (correct) "正确！" else "错误",
                    modifier = Modifier.weight(1f),
                    color = if (correct) PracticeSuccess else PracticeDanger,
                    fontWeight = FontWeight.SemiBold,
                )
                IconButton(onClick = { speak(word.word) }, modifier = Modifier.size(34.dp)) {
                    Icon(
                        Icons.AutoMirrored.Filled.VolumeUp,
                        contentDescription = "朗读",
                        tint = accent,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
            Spacer(Modifier.height(8.dp))
            Text(word.word, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            word.phonetic?.let {
                Text(it, color = PracticeMuted, fontSize = 11.sp)
            }
            Spacer(Modifier.height(6.dp))
            Text(word.definition, color = Color(0xFF475569), fontSize = 13.sp)
            word.example?.takeIf { it.isNotBlank() }?.let {
                Spacer(Modifier.height(9.dp))
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(9.dp),
                    color = accent.copy(alpha = 0.08f),
                ) {
                    Column(Modifier.padding(9.dp)) {
                        Text("例句", color = accent, fontSize = 10.sp)
                        Text(it, color = Color(0xFF475569), fontSize = 12.sp)
                    }
                }
            }
            if (!correct) {
                Spacer(Modifier.height(7.dp))
                Text("你的输入：$userInput", color = PracticeMuted, fontSize = 11.sp)
            }
        }
    }
}

@Composable
private fun LetterBox(
    text: String,
    color: Color,
    filled: Boolean,
    dashed: Boolean,
    enabled: Boolean = true,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier.size(width = 47.dp, height = 54.dp),
        shape = RoundedCornerShape(12.dp),
        color = if (filled) color.copy(alpha = 0.10f) else Color(0xFFF8FAFC),
        border = BorderStroke(if (dashed) 1.dp else 2.dp, color),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                text,
                color = color,
                fontSize = 19.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
            )
        }
    }
}

@Composable
private fun PracticeKeyboard(
    accent: Color,
    canSubmit: Boolean,
    onLetter: (Char) -> Unit,
    onDelete: () -> Unit,
    onSubmit: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(15.dp),
        color = Color(0xFFF1F5F9),
    ) {
        Column(
            modifier = Modifier.padding(8.dp),
            verticalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            KeyboardRow("qwertyuiop", accent, onLetter)
            KeyboardRow("asdfghjkl", accent, onLetter)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                "zxcvbnm".forEach { letter ->
                    KeyboardLetterKey(
                        letter = letter,
                        onClick = { onLetter(letter) },
                        modifier = Modifier.weight(1f),
                    )
                }
                Surface(
                    onClick = onDelete,
                    modifier = Modifier
                        .weight(1.15f)
                        .height(42.dp),
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFFE2E8F0),
                    border = BorderStroke(1.dp, Color(0xFFCBD5E1)),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = "删除",
                            modifier = Modifier.size(17.dp),
                            tint = PracticeMuted,
                        )
                    }
                }
                Surface(
                    onClick = onSubmit,
                    enabled = canSubmit,
                    modifier = Modifier
                        .weight(1.45f)
                        .height(42.dp),
                    shape = RoundedCornerShape(8.dp),
                    color = if (canSubmit) accent else Color(0xFFCBD5E1),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            "提交",
                            color = if (canSubmit) Color.White else PracticeMuted,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun KeyboardRow(
    letters: String,
    accent: Color,
    onLetter: (Char) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        letters.forEach { letter ->
            KeyboardLetterKey(
                letter = letter,
                onClick = { onLetter(letter) },
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun KeyboardLetterKey(
    letter: Char,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        onClick = onClick,
        modifier = modifier.height(42.dp),
        shape = RoundedCornerShape(8.dp),
        color = Color.White,
        border = BorderStroke(1.dp, Color(0xFFCBD5E1)),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                letter.toString(),
                color = Color(0xFF334155),
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun PracticeSessionSummary(
    results: List<SessionWordResult>,
    score: Int,
    total: Int,
    onBack: () -> Unit,
    onRetry: () -> Unit,
) {
    val accuracy = if (total > 0) ((score.toFloat() / total) * 100).toInt() else 0
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(17.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = CardDefaults.outlinedCardBorder(),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Icon(
                        Icons.Default.EmojiEvents,
                        contentDescription = null,
                        tint = PracticeAmber,
                        modifier = Modifier.size(50.dp),
                    )
                    Spacer(Modifier.height(10.dp))
                    Text("练习完成！", fontSize = 21.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "$score / $total",
                        color = PracticeIndigo,
                        fontSize = 30.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Text("正确率 $accuracy%", color = PracticeMuted, fontSize = 13.sp)
                    Spacer(Modifier.height(10.dp))
                    Surface(
                        color = when {
                            accuracy >= 80 -> Color(0xFFD1FAE5)
                            accuracy >= 60 -> Color(0xFFFEF3C7)
                            else -> Color(0xFFFEE2E2)
                        },
                        shape = RoundedCornerShape(100.dp),
                    ) {
                        Text(
                            when {
                                accuracy >= 80 -> "优秀"
                                accuracy >= 60 -> "良好"
                                else -> "继续加油"
                            },
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp),
                            color = when {
                                accuracy >= 80 -> PracticeSuccess
                                accuracy >= 60 -> PracticeAmber
                                else -> PracticeDanger
                            },
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }
            }
        }
        item {
            Text("详细结果", color = Color(0xFF334155), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
        }
        itemsIndexed(results) { _, item ->
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(11.dp),
                color = Color.White,
                border = CardDefaults.outlinedCardBorder(),
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        if (item.correct) Icons.Default.CheckCircle else Icons.Default.Close,
                        contentDescription = null,
                        tint = if (item.correct) PracticeSuccess else PracticeDanger,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        item.word,
                        modifier = Modifier.weight(1f),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                    )
                    Text(
                        if (item.correct) "正确" else "错误",
                        color = if (item.correct) PracticeSuccess else PracticeDanger,
                        fontSize = 11.sp,
                    )
                }
            }
        }
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                OutlinedButton(
                    onClick = onBack,
                    modifier = Modifier
                        .weight(1f)
                        .height(50.dp),
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(Modifier.width(5.dp))
                    Text("返回")
                }
                Button(
                    onClick = onRetry,
                    modifier = Modifier
                        .weight(1f)
                        .height(50.dp),
                ) {
                    Icon(
                        Icons.Default.Replay,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(Modifier.width(5.dp))
                    Text("再来一轮")
                }
            }
        }
    }
}

@Composable
private fun EmptyPracticeMode(onBack: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("暂无单词可练习", color = PracticeMuted)
        Spacer(Modifier.height(14.dp))
        OutlinedButton(onClick = onBack) {
            Icon(
                Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
            )
            Spacer(Modifier.width(5.dp))
            Text("返回选词")
        }
    }
}

private fun practiceTarget(word: String): String =
    word.lowercase().filter { it in 'a'..'z' }

private fun fillBlankPositions(word: String): List<Int> {
    if (word.isEmpty()) return emptyList()
    if (word.length <= 3) return (1 until word.length).toList().ifEmpty { listOf(0) }

    val start = floor(word.length * 0.3).toInt().coerceAtLeast(1)
    val end = ceil(word.length * 0.7).toInt().coerceAtMost(word.lastIndex)
    return (start until end).toList().ifEmpty {
        listOf((word.length / 2).coerceIn(1, word.lastIndex - 1))
    }
}

private fun dictationWaitTime(word: String): Long {
    val syllables = Regex("[aeiouy]+")
        .findAll(practiceTarget(word))
        .count()
        .coerceAtLeast(1)
    return when (syllables) {
        1 -> 4_000L
        2 -> 6_500L
        else -> 10_000L
    }
}
