package com.wordmind.app.ui

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.wordmind.app.data.PracticeWord
import com.wordmind.app.data.SpellingReward
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.math.PI
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.floor
import kotlin.math.min
import kotlin.math.sin

private typealias PracticeSubmit = (
    word: PracticeWord,
    correct: Boolean,
    input: String,
    mode: String,
    durationMs: Long,
    onReward: (SpellingReward) -> Unit,
) -> Unit

private val PracticeExtraKeys = listOf(
    ' ' to "空格",
    ',' to ",",
    '?' to "?",
    '.' to ".",
    '!' to "!",
    '"' to "\"",
    '\'' to "'",
)

private data class LetterToken(
    val id: Int,
    val letter: Char,
)

internal fun practiceSpeechRepeatDelay(word: String): Long =
    (1_100L + word.trim().length * 70L).coerceAtMost(2_200L)

internal suspend fun autoSpeakPracticeWordTwice(
    word: String,
    speak: (String) -> Unit,
    example: String? = null,
) {
    speak(word)
    delay(practiceSpeechRepeatDelay(word))
    speak(word)
    selectPracticeExample(example, word)?.let { practiceExample ->
        delay(practiceSpeechRepeatDelay(word))
        speak(practiceExample)
    }
}

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
    var activeSlotIndex by remember { mutableIntStateOf(0) }
    var highlightedPoolTokenId by remember { mutableStateOf<Int?>(null) }
    var result by remember { mutableStateOf<Boolean?>(null) }
    var reward by remember { mutableStateOf<SpellingReward?>(null) }
    var score by remember { mutableIntStateOf(0) }
    var sessionPoints by remember { mutableIntStateOf(0) }
    var sessionResults by remember { mutableStateOf<List<SessionWordResult>>(emptyList()) }
    var showSummary by remember { mutableStateOf(false) }
    var retryToken by remember { mutableIntStateOf(0) }
    var startedAt by remember { mutableLongStateOf(System.currentTimeMillis()) }
    val current = words.getOrNull(index)
    val target = current?.let { practiceTarget(it.word) }.orEmpty()

    LaunchedEffect(current?.id, retryToken) {
        if (current != null) {
            val targetTokens = target.mapIndexed { tokenIndex, char ->
                LetterToken(tokenIndex, char)
            }
            pool = targetTokens.shuffled()
            slots = target.mapIndexed { tokenIndex, character ->
                if (character.isWhitespace()) tokenIndex else null
            }
            activeSlotIndex = target.indexOfFirst { !it.isWhitespace() }.coerceAtLeast(0)
            highlightedPoolTokenId = null
            reward = null
            result = null
            startedAt = System.currentTimeMillis()
            autoSpeakPracticeWordTwice(current.word, speak, current.example)
        }
    }

    if (showSummary) {
        PracticeSessionSummary(
            results = sessionResults,
            score = score,
            points = sessionPoints,
            total = words.size,
            onBack = onBack,
            onRetry = {
                index = 0
                score = 0
                sessionPoints = 0
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
    val contextAnswer = slots.map { tokenId ->
        pool.firstOrNull { it.id == tokenId }?.letter ?: ' '
    }.joinToString("").trimEnd()
    val hasContextExample = selectPracticeExample(current.example, current.word) != null

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
        )
        PracticeExampleCard(
            word = current,
            accent = PracticeIndigo,
            speak = speak,
            reveal = result != null,
            answer = contextAnswer,
            activeInputIndex = activeSlotIndex,
            onInputBlockClick = if (result == null) {
                { characterIndex ->
                    activeSlotIndex = characterIndex
                    val tokenId = slots.getOrNull(characterIndex)
                    highlightedPoolTokenId = tokenId
                    if (tokenId != null) {
                        slots = slots.toMutableList().also {
                            it[characterIndex] = null
                        }
                    }
                }
            } else {
                null
            },
        )
        Spacer(Modifier.height(15.dp))

        if (!hasContextExample) {
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
                            if (result == null) {
                                activeSlotIndex = slotIndex
                                if (tokenId != null) {
                                    highlightedPoolTokenId = tokenId
                                    slots = slots.toMutableList().also { it[slotIndex] = null }
                                } else {
                                    highlightedPoolTokenId = null
                                }
                            }
                        },
                    )
                    Spacer(Modifier.width(7.dp))
                }
            }
            Spacer(Modifier.height(22.dp))
        }

        if (result == null) {
            Text(
                if (hasContextExample) {
                    "点击字母积木填入例句，再次点击已选字母可撤回"
                } else {
                    "点击字母积木，按顺序拼出单词"
                },
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
                pool.filterNot { it.letter.isWhitespace() }.forEach { token ->
                    val used = token.id in slots
                    LetterBox(
                        text = token.letter.toString(),
                        color = when {
                            used -> Color(0xFFCBD5E1)
                            token.id == highlightedPoolTokenId -> Color(0xFFF59E0B)
                            else -> PracticeIndigo
                        },
                        filled = !used,
                        dashed = false,
                        onClick = {
                            if (used) {
                                val usedSlot = slots.indexOf(token.id)
                                if (usedSlot >= 0) {
                                    activeSlotIndex = usedSlot
                                    highlightedPoolTokenId = token.id
                                    slots = slots.toMutableList().also {
                                        it[usedSlot] = null
                                    }
                                }
                            } else {
                                val destination = activeSlotIndex
                                    .takeIf { it in slots.indices }
                                    ?: slots.indexOfFirst { it == null }
                                if (destination >= 0) {
                                    highlightedPoolTokenId = null
                                    val nextSlots = slots.toMutableList().also {
                                        it[destination] = token.id
                                    }
                                    slots = nextSlots
                                    val nextEmptyAfter = ((destination + 1)..nextSlots.lastIndex)
                                        .firstOrNull { nextSlots[it] == null }
                                        ?: -1
                                    val nextEmpty = if (nextEmptyAfter >= 0) {
                                        nextEmptyAfter
                                    } else {
                                        nextSlots.indexOfFirst { it == null }
                                    }
                                    activeSlotIndex = if (nextEmpty >= 0) {
                                        nextEmpty
                                    } else {
                                        destination
                                    }
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
                reward = reward,
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
                    ) { earnedReward ->
                        reward = earnedReward
                        sessionPoints += earnedReward.pointsEarned
                    }
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
    var reward by remember { mutableStateOf<SpellingReward?>(null) }
    var score by remember { mutableIntStateOf(0) }
    var sessionPoints by remember { mutableIntStateOf(0) }
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
            reward = null
            result = null
            startedAt = System.currentTimeMillis()
            autoSpeakPracticeWordTwice(current.word, speak, current.example)
        }
    }

    if (showSummary) {
        PracticeSessionSummary(
            results = sessionResults,
            score = score,
            points = sessionPoints,
            total = words.size,
            onBack = onBack,
            onRetry = {
                index = 0
                score = 0
                sessionPoints = 0
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
    val contextAnswer = target.mapIndexed { charIndex, char ->
        if (charIndex in hiddenPositions) answers[charIndex] ?: ' ' else char
    }.joinToString("").trimEnd()
    val hasContextExample = selectPracticeExample(current.example, current.word) != null

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
        PracticeExampleCard(
            word = current,
            accent = PracticeSuccess,
            speak = speak,
            reveal = result != null,
            answer = contextAnswer,
            activeInputIndex = activePosition,
            onInputBlockClick = if (result == null) {
                { characterIndex ->
                    val blankIndex = hiddenPositions.indexOf(characterIndex)
                    if (blankIndex >= 0) activeBlankIndex = blankIndex
                }
            } else {
                null
            },
        )
        Spacer(Modifier.height(14.dp))

        if (!hasContextExample) {
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
        }

        if (result == null) {
            PracticeKeyboard(
                accent = PracticeSuccess,
                canSubmit = allFilled,
                includeSpace = false,
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
                    ) { earnedReward ->
                        reward = earnedReward
                        sessionPoints += earnedReward.pointsEarned
                    }
                },
            )
        } else {
            PracticeAnswerResult(
                correct = result == true,
                word = current,
                userInput = answer,
                accent = PracticeSuccess,
                speak = speak,
                reward = reward,
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
    var activeInputIndex by remember { mutableIntStateOf(0) }
    var timeLeft by remember { mutableIntStateOf(3) }
    var score by remember { mutableIntStateOf(0) }
    var reward by remember { mutableStateOf<SpellingReward?>(null) }
    var sessionPoints by remember { mutableIntStateOf(0) }
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
            reward = null
            activeInputIndex = 0
            timeLeft = 3
            launch {
                autoSpeakPracticeWordTwice(current.word, speak, current.example)
            }
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
            points = sessionPoints,
            total = words.size,
            onBack = onBack,
            onRetry = {
                index = 0
                score = 0
                sessionPoints = 0
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
    val hasContextExample = selectPracticeExample(current.example, current.word) != null

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
                Column {
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
                    PracticeExampleCard(
                        word = current,
                        accent = PracticeAmber,
                        speak = speak,
                        reveal = true,
                    )
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
                PracticeExampleCard(
                    word = current,
                    accent = PracticeAmber,
                    speak = speak,
                    answer = input,
                    activeInputIndex = activeInputIndex,
                    onInputBlockClick = { characterIndex ->
                        activeInputIndex = characterIndex
                    },
                )
                if (!hasContextExample) {
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
                }
                Spacer(Modifier.height(16.dp))
                PracticeKeyboard(
                    accent = PracticeAmber,
                    canSubmit = input.isNotBlank(),
                    onLetter = { character ->
                        val characters = input.toMutableList()
                        while (characters.size <= activeInputIndex) {
                            characters += '\u00A0'
                        }
                        characters[activeInputIndex] = character
                        input = characters.joinToString("")
                        val nextEmpty = ((activeInputIndex + 1)..characters.lastIndex)
                            .firstOrNull {
                                characters[it] == '\u00A0' || characters[it] == ' '
                            }
                            ?: -1
                        activeInputIndex = if (nextEmpty >= 0) {
                            nextEmpty
                        } else {
                            (activeInputIndex + 1).coerceAtMost(target.lastIndex.coerceAtLeast(0))
                        }
                    },
                    onDelete = {
                        if (activeInputIndex in input.indices) {
                            input = input.toMutableList().also {
                                it[activeInputIndex] = '\u00A0'
                            }.joinToString("").trimEnd()
                        }
                    },
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
                        ) { earnedReward ->
                            reward = earnedReward
                            sessionPoints += earnedReward.pointsEarned
                        }
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
                    reward = reward,
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
        Text("答对 $score", color = scoreColor, fontSize = 14.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun PracticePromptCard(
    word: PracticeWord,
    speak: (String) -> Unit,
    accent: Color,
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
        }
    }
}

@Composable
private fun PracticeExampleCard(
    word: PracticeWord,
    accent: Color,
    speak: (String) -> Unit,
    reveal: Boolean = false,
    answer: String = "",
    activeInputIndex: Int? = null,
    onInputBlockClick: ((Int) -> Unit)? = null,
) {
    val example = selectPracticeExample(word.example, word.word) ?: return
    val exampleBackground = when (accent) {
        PracticeIndigo -> Color(0xFFF3F2FF)
        PracticeSuccess -> Color(0xFFECFDF5)
        PracticeAmber -> Color(0xFFFFF8E6)
        else -> Color(0xFFF8FAFC)
    }
    val exampleBorder = when (accent) {
        PracticeIndigo -> Color(0xFFC7C3FF)
        PracticeSuccess -> Color(0xFFA7F3D0)
        PracticeAmber -> Color(0xFFFDE68A)
        else -> Color(0xFFE2E8F0)
    }

    Spacer(Modifier.height(10.dp))
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(13.dp),
        color = exampleBackground,
        border = BorderStroke(1.dp, exampleBorder),
        shadowElevation = 1.dp,
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 10.dp, vertical = 12.dp),
            contentAlignment = Alignment.Center,
        ) {
            if (reveal) {
                Text(
                    highlightPracticeWord(example, word.word, accent),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 38.dp),
                    color = Color(0xFF334155),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    lineHeight = 30.sp,
                    textAlign = TextAlign.Center,
                )
            } else {
                PracticeExampleInputBlocks(
                    example = example,
                    word = word.word,
                    answer = answer,
                    activeInputIndex = activeInputIndex,
                    onInputBlockClick = onInputBlockClick,
                )
            }
            if (reveal) {
                IconButton(
                    onClick = { speak(example) },
                    modifier = Modifier
                        .align(Alignment.CenterEnd)
                        .size(34.dp),
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.VolumeUp,
                        contentDescription = "朗读完整例句",
                        tint = accent,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun CorrectFireworks(reward: SpellingReward?) {
    CorrectCelebrationOverlay(reward)

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(82.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                "★ 太棒啦！ ★",
                color = PracticeSuccess,
                fontSize = 19.sp,
                fontWeight = FontWeight.ExtraBold,
            )
            Spacer(Modifier.height(5.dp))
            Surface(
                color = Color(0xFFFFF0B8),
                shape = RoundedCornerShape(999.dp),
            ) {
                Text(
                    celebrationRewardText(reward),
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                    color = PracticeAmber,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
    }
}

private fun celebrationRewardText(reward: SpellingReward?): String = when {
    reward == null -> "积分结算中…"
    reward.pointsEarned > 0 -> "+${reward.pointsEarned} 积分"
    reward.rewardCapped -> "该词今日奖励已完成"
    else -> "继续保持"
}

@Composable
private fun CorrectCelebrationOverlay(reward: SpellingReward?) {
    val progress = remember { Animatable(0f) }
    var visible by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        launch { playCuteCelebrationChime() }
        progress.snapTo(0f)
        progress.animateTo(
            targetValue = 1f,
            animationSpec = tween(
                durationMillis = 2_400,
                easing = FastOutSlowInEasing,
            ),
        )
        visible = false
    }

    if (!visible) return

    Dialog(
        onDismissRequest = {},
        properties = DialogProperties(
            dismissOnBackPress = false,
            dismissOnClickOutside = false,
            usePlatformDefaultWidth = false,
        ),
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            Canvas(Modifier.fillMaxSize()) {
                val animationProgress = progress.value
                val overlayAlpha = when {
                    animationProgress < 0.08f -> animationProgress / 0.08f
                    animationProgress > 0.82f -> (1f - animationProgress) / 0.18f
                    else -> 1f
                }.coerceIn(0f, 1f)
                drawRect(Color(0xFF0F172A).copy(alpha = overlayAlpha * 0.16f))

                val colors = listOf(
                    Color(0xFFF59E0B),
                    Color(0xFFEC4899),
                    Color(0xFF8B5CF6),
                    Color(0xFF06B6D4),
                    Color(0xFF22C55E),
                    Color(0xFFF97316),
                    Color(0xFFFDE047),
                )
                repeat(108) { particleIndex ->
                    val delay = (particleIndex % 12) * 0.018f
                    val particleProgress = (
                        (animationProgress * 1.28f - delay) / (1f - delay)
                        ).coerceIn(0f, 1f)
                    if (particleProgress <= 0f) return@repeat

                    val leftSide = particleIndex % 2 == 0
                    val direction = if (leftSide) 1f else -1f
                    val originX = if (leftSide) size.width * 0.04f else size.width * 0.96f
                    val originY = size.height * (0.64f + (particleIndex % 5) * 0.025f)
                    val horizontalTravel =
                        size.width * (0.28f + (particleIndex % 9) * 0.025f)
                    val lift = size.height * (0.30f + (particleIndex % 7) * 0.026f)
                    val wobble = sin(
                        particleProgress * PI.toFloat() * 3f + particleIndex,
                    ) * (10f + particleIndex % 4 * 4f)
                    val center = Offset(
                        x = originX +
                            direction * horizontalTravel * particleProgress +
                            wobble,
                        y = originY -
                            lift * particleProgress +
                            size.height * 0.21f * particleProgress * particleProgress,
                    )
                    val alpha = (
                        (1f - particleProgress) * 1.7f
                        ).coerceIn(0f, 1f) * overlayAlpha
                    val color = colors[particleIndex % colors.size].copy(alpha = alpha)
                    val radius = 7f + (particleIndex % 4) * 2f

                    when (particleIndex % 4) {
                        0 -> drawCelebrationStar(
                            center = center,
                            radius = radius * 1.45f,
                            color = color,
                            rotation = particleProgress * 240f,
                        )
                        1 -> drawCircle(color, radius, center)
                        else -> rotate(
                            degrees = particleProgress * 300f + particleIndex * 17f,
                            pivot = center,
                        ) {
                            drawRect(
                                color = color,
                                topLeft = Offset(center.x - radius, center.y - radius * 0.45f),
                                size = Size(radius * 2f, radius * 0.9f),
                            )
                        }
                    }
                }
            }

            val cardAlpha = when {
                progress.value < 0.1f -> progress.value / 0.1f
                progress.value > 0.8f -> (1f - progress.value) / 0.2f
                else -> 1f
            }.coerceIn(0f, 1f)
            val cardScale = when {
                progress.value < 0.16f -> 0.58f + progress.value / 0.16f * 0.54f
                progress.value < 0.28f -> 1.12f - (progress.value - 0.16f) / 0.12f * 0.15f
                else -> 0.97f + min((progress.value - 0.28f) / 0.14f, 1f) * 0.03f
            }
            Surface(
                modifier = Modifier
                    .width(286.dp)
                    .graphicsLayer {
                        alpha = cardAlpha
                        scaleX = cardScale
                        scaleY = cardScale
                        rotationZ = sin(progress.value * PI.toFloat() * 4f) *
                            (1f - progress.value) * 5f
                    },
                color = Color(0xFFFFFCF5),
                shape = RoundedCornerShape(30.dp),
                border = BorderStroke(4.dp, Color(0xFFFBBF24)),
                shadowElevation = 18.dp,
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 22.dp, vertical = 20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Surface(
                        modifier = Modifier.size(76.dp),
                        shape = CircleShape,
                        color = Color(0xFFF59E0B),
                        border = BorderStroke(4.dp, Color.White),
                        shadowElevation = 8.dp,
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                "★",
                                color = Color.White,
                                fontSize = 45.sp,
                                fontWeight = FontWeight.Black,
                            )
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "太棒啦！",
                        color = Color(0xFFF97316),
                        fontSize = 27.sp,
                        fontWeight = FontWeight.Black,
                    )
                    Text(
                        "这道题答对了，继续加油！",
                        color = Color(0xFFEC4899),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.height(11.dp))
                    Surface(
                        color = Color(0xFFFFE8A3),
                        shape = RoundedCornerShape(999.dp),
                    ) {
                        Text(
                            celebrationRewardText(reward),
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 7.dp),
                            color = Color(0xFFB45309),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Black,
                        )
                    }
                }
            }
        }
    }
}

private fun DrawScope.drawCelebrationStar(
    center: Offset,
    radius: Float,
    color: Color,
    rotation: Float,
) {
    val path = Path()
    repeat(10) { pointIndex ->
        val pointRadius = if (pointIndex % 2 == 0) radius else radius * 0.44f
        val angle = Math.toRadians(
            (rotation - 90f + pointIndex * 36f).toDouble(),
        )
        val point = Offset(
            x = center.x + cos(angle).toFloat() * pointRadius,
            y = center.y + sin(angle).toFloat() * pointRadius,
        )
        if (pointIndex == 0) path.moveTo(point.x, point.y) else path.lineTo(point.x, point.y)
    }
    path.close()
    drawPath(path, color)
}

private suspend fun playCuteCelebrationChime() = withContext(Dispatchers.Default) {
    val sampleRate = 44_100
    val durationSeconds = 1.05
    val sampleCount = (sampleRate * durationSeconds).toInt()
    val samples = ShortArray(sampleCount)
    val notes = listOf(
        Triple(523.25, 0.00, 0.34),
        Triple(659.25, 0.10, 0.38),
        Triple(783.99, 0.20, 0.42),
        Triple(1046.50, 0.34, 0.62),
    )

    for (sampleIndex in samples.indices) {
        val time = sampleIndex.toDouble() / sampleRate
        var mixedSample = 0.0
        notes.forEach { (frequency, start, duration) ->
            val localTime = time - start
            if (localTime in 0.0..duration) {
                val attack = (localTime / 0.025).coerceIn(0.0, 1.0)
                val decay = exp(-4.4 * localTime / duration)
                val envelope = attack * decay
                mixedSample += sin(2.0 * PI * frequency * localTime) * envelope * 0.28
                mixedSample += sin(2.0 * PI * frequency * 2.0 * localTime) * envelope * 0.07
            }
        }
        samples[sampleIndex] = (
            mixedSample.coerceIn(-1.0, 1.0) * Short.MAX_VALUE
            ).toInt().toShort()
    }

    val minimumBufferSize = AudioTrack.getMinBufferSize(
        sampleRate,
        AudioFormat.CHANNEL_OUT_MONO,
        AudioFormat.ENCODING_PCM_16BIT,
    )
    val track = AudioTrack.Builder()
        .setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_GAME)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build(),
        )
        .setAudioFormat(
            AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setSampleRate(sampleRate)
                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .build(),
        )
        .setTransferMode(AudioTrack.MODE_STATIC)
        .setBufferSizeInBytes(maxOf(minimumBufferSize, samples.size * 2))
        .build()

    try {
        track.write(samples, 0, samples.size, AudioTrack.WRITE_BLOCKING)
        track.play()
        delay((durationSeconds * 1_000).toLong() + 80L)
    } finally {
        runCatching { track.stop() }
        track.release()
    }
}

@Composable
private fun PracticeAnswerResult(
    correct: Boolean,
    word: PracticeWord,
    userInput: String,
    accent: Color,
    speak: (String) -> Unit,
    reward: SpellingReward?,
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
            if (correct) {
                CorrectFireworks(reward)
                Spacer(Modifier.height(2.dp))
            }
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
            selectPracticeExample(word.example, word.word)?.let {
                Spacer(Modifier.height(9.dp))
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(9.dp),
                    color = accent.copy(alpha = 0.08f),
                ) {
                    Column(Modifier.padding(9.dp)) {
                        Text("例句", color = accent, fontSize = 10.sp)
                        Text(
                            highlightPracticeWord(it, word.word, accent),
                            color = Color(0xFF475569),
                            fontSize = 11.sp,
                        )
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

private fun selectPracticeExample(example: String?, word: String): String? {
    val candidates = example
        ?.lineSequence()
        ?.map { it.trim() }
        ?.filter { it.isNotEmpty() }
        ?.toList()
        .orEmpty()
    if (candidates.isEmpty()) return null

    val target = word.trim()
    if (target.isEmpty()) return null
    val targetPattern = Regex(
        "(?i)(?<![a-z])${Regex.escape(target)}(?![a-z])",
    )
    return candidates.firstOrNull { targetPattern.containsMatchIn(it) }
}

private fun highlightPracticeWord(
    example: String,
    word: String,
    accent: Color,
): AnnotatedString {
    val target = word.trim()
    if (target.isEmpty()) return AnnotatedString(example)

    val targetPattern = Regex(
        "(?i)(?<![a-z])${Regex.escape(target)}(?![a-z])",
    )
    val matches = targetPattern.findAll(example).toList()
    if (matches.isEmpty()) return AnnotatedString(example)

    return buildAnnotatedString {
        var cursor = 0
        matches.forEach { match ->
            append(example.substring(cursor, match.range.first))
            withStyle(SpanStyle(color = accent, fontWeight = FontWeight.Bold)) {
                append(match.value)
            }
            cursor = match.range.last + 1
        }
        if (cursor < example.length) {
            append(example.substring(cursor))
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PracticeExampleInputBlocks(
    example: String,
    word: String,
    answer: String,
    activeInputIndex: Int?,
    onInputBlockClick: ((Int) -> Unit)?,
) {
    val target = word.trim()
    val targetPattern = Regex(
        "(?i)(?<![a-z])${Regex.escape(target)}(?![a-z])",
    )
    val match = target.takeIf { it.isNotEmpty() }?.let { targetPattern.find(example) }
    if (match == null) {
        Text(
            example,
            modifier = Modifier.fillMaxWidth(),
            color = Color(0xFF334155),
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            lineHeight = 24.sp,
            textAlign = TextAlign.Center,
        )
        return
    }

    val prefix = example.substring(0, match.range.first)
    val suffix = example.substring(match.range.last + 1)
    FlowRow(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        PracticeExampleTextFlow(prefix)
        PracticeInputBlockSequence(
            expected = match.value,
            answer = answer,
            activeInputIndex = activeInputIndex,
            onInputBlockClick = onInputBlockClick,
        )
        PracticeExampleTextFlow(suffix)
    }
}

@Composable
private fun PracticeExampleTextFlow(text: String) {
    Regex("""\s+|\S+""").findAll(text).forEach { match ->
        val chunk = match.value
        if (chunk.isBlank()) {
            Spacer(
                Modifier.size(
                    width = (chunk.length * 5).dp,
                    height = 36.dp,
                ),
            )
        } else {
            Box(
                modifier = Modifier.height(36.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    chunk,
                    color = Color(0xFF334155),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    softWrap = false,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun PracticeInputBlockSequence(
    expected: String,
    answer: String,
    activeInputIndex: Int?,
    onInputBlockClick: ((Int) -> Unit)?,
) {
    expected.forEachIndexed { characterIndex, expectedCharacter ->
        if (expectedCharacter.isWhitespace()) {
            Spacer(Modifier.size(width = 7.dp, height = 36.dp))
        } else {
            val enteredCharacter = answer.getOrNull(characterIndex)
            val hasInput = enteredCharacter != null &&
                !enteredCharacter.isWhitespace() &&
                enteredCharacter != '\u00A0'
            val isActive = characterIndex == activeInputIndex
            val baseModifier = Modifier
                .padding(horizontal = 1.5.dp, vertical = 2.dp)
                .size(width = 27.dp, height = 32.dp)
            val blockModifier = if (onInputBlockClick != null) {
                baseModifier.clickable {
                    onInputBlockClick(characterIndex)
                }
            } else {
                baseModifier
            }
            Surface(
                modifier = blockModifier,
                shape = RoundedCornerShape(6.dp),
                color = when {
                    isActive -> Color(0xFFFFE0A3)
                    hasInput -> Color(0xFFFFFBEB)
                    else -> Color.White
                },
                border = BorderStroke(
                    if (isActive) 2.5.dp else 1.5.dp,
                    if (isActive) Color(0xFFD97706) else Color(0xFFF59E0B),
                ),
                shadowElevation = if (isActive) 4.dp else 0.dp,
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = if (hasInput) enteredCharacter.toString() else "",
                        color = Color(0xFFF59E0B),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                    )
                }
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
    includeSpace: Boolean = true,
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
                PracticeExtraKeys
                    .filter { (value, _) -> includeSpace || value != ' ' }
                    .forEach { (value, label) ->
                    KeyboardTextKey(
                        label = label,
                        onClick = { onLetter(value) },
                        modifier = Modifier.weight(if (value == ' ') 2f else 1f),
                    )
                }
            }
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
    KeyboardTextKey(
        label = letter.toString(),
        onClick = onClick,
        modifier = modifier,
    )
}

@Composable
private fun KeyboardTextKey(
    label: String,
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
                label,
                color = Color(0xFF334155),
                fontSize = if (label == "空格") 11.sp else 14.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun PracticeSessionSummary(
    results: List<SessionWordResult>,
    score: Int,
    points: Int,
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
                    Spacer(Modifier.height(9.dp))
                    Surface(
                        color = Color(0xFFFFF7D6),
                        shape = RoundedCornerShape(100.dp),
                    ) {
                        Text(
                            "本轮获得 +$points 积分",
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp),
                            color = PracticeAmber,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
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
    word
        .lowercase()
        .replace('’', '\'')
        .replace('‘', '\'')
        .replace('“', '"')
        .replace('”', '"')
        .filter { it in 'a'..'z' || it in " ,?.!\"'" }
        .trim()

private fun fillBlankPositions(word: String): List<Int> {
    val letterPositions = word.indices.filter { word[it].isLetter() }
    if (letterPositions.isEmpty()) return emptyList()
    if (letterPositions.size <= 3) {
        return letterPositions.drop(1).ifEmpty { listOf(letterPositions.first()) }
    }

    val start = floor(letterPositions.size * 0.3).toInt().coerceAtLeast(1)
    val end = ceil(letterPositions.size * 0.7)
        .toInt()
        .coerceAtMost(letterPositions.lastIndex)
    return (start until end).map { letterPositions[it] }.ifEmpty {
        listOf(letterPositions[letterPositions.size / 2])
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
