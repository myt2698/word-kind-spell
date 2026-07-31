package com.wordmind.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wordmind.app.data.DailyReading
import com.wordmind.app.data.ReadingReward
import com.wordmind.app.data.WordMindApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
@OptIn(ExperimentalLayoutApi::class)
internal fun DailyReadingMode(
    api: WordMindApi,
    onBack: () -> Unit,
) {
    var reading by remember { mutableStateOf<DailyReading?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var activeStory by remember { mutableStateOf(0) }
    var unlockedStory by remember { mutableStateOf(0) }
    var stage by remember { mutableStateOf("story") }
    var resumeParagraph by remember { mutableStateOf(0) }
    var completedStories by remember { mutableStateOf<Set<Int>>(emptySet()) }
    var answerSelections by remember { mutableStateOf<Map<String, Int>>(emptyMap()) }
    var unlockMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    LaunchedEffect(Unit) {
        try {
            val result = api.getDailyReading()
            reading = result
            completedStories = result.progress.completedStories.toSet()
            answerSelections = result.progress.answered.associate {
                "${it.storyIndex}-${it.questionIndex}" to it.selectedIndex
            }
            if (result.progress.currentStoryIndex >= result.stories.size) {
                stage = "complete"
                activeStory = result.stories.lastIndex.coerceAtLeast(0)
                unlockedStory = result.stories.lastIndex.coerceAtLeast(0)
            } else {
                activeStory = result.progress.currentStoryIndex
                unlockedStory = result.progress.currentStoryIndex
                stage = result.progress.stage
                resumeParagraph = result.progress.paragraphIndex
            }
        } catch (exception: Exception) {
            error = exception.message ?: "加载失败"
        } finally {
            loading = false
        }
    }

    LaunchedEffect(loading, stage, resumeParagraph) {
        if (!loading && stage == "story" && resumeParagraph > 0) {
            delay(300)
            // Back, hero, map and story title occupy the first four items.
            listState.animateScrollToItem(4 + resumeParagraph)
        }
    }

    LaunchedEffect(unlockMessage) {
        if (unlockMessage == null) return@LaunchedEffect
        delay(2_600)
        unlockMessage = null
    }

    val currentStory = reading?.stories?.getOrNull(activeStory)
    val paragraphs = remember(currentStory?.content) {
        splitReadingParagraphs(currentStory?.content.orEmpty())
    }

    LazyColumn(
        state = listState,
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp, 16.dp, 16.dp, 40.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Row(
                modifier = Modifier.clickable(onClick = onBack).padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回", tint = PracticeMuted)
                Text("返回", color = PracticeMuted, fontSize = 14.sp)
            }
        }
        item {
            Surface(color = Color(0xFFFAF5FF), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(18.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.AutoMirrored.Filled.MenuBook, contentDescription = null, tint = PracticePurple)
                        Spacer(Modifier.padding(5.dp))
                        Column {
                            Text("今日单词趣味阅读", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFF111827))
                            Text("三关连续挑战 · 自动保存阅读进度", fontSize = 11.sp, color = PracticeMuted)
                        }
                    }
                    reading?.words?.takeIf { it.isNotEmpty() }?.let { words ->
                        Spacer(Modifier.height(12.dp))
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            words.forEach { word ->
                                Surface(color = Color.White, shape = RoundedCornerShape(20.dp)) {
                                    Text(word, Modifier.padding(horizontal = 9.dp, vertical = 4.dp), color = PracticePurple, fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }
            }
        }

        when {
            loading -> item {
                Column(Modifier.fillMaxWidth().padding(40.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(color = PracticePurple)
                }
            }
            error != null -> item {
                Text("加载失败：$error", color = PracticeDanger, modifier = Modifier.padding(20.dp))
            }
            reading?.stories.isNullOrEmpty() -> item {
                Text("还没有今日单词，请返回选择后再来阅读。", color = PracticeMuted, modifier = Modifier.padding(20.dp))
            }
            else -> {
                item {
                    ReadingLevelMap(
                        reading = reading!!,
                        activeStory = activeStory,
                        unlockedStory = unlockedStory,
                        completedStories = completedStories,
                        stage = stage,
                        onStory = { storyIndex ->
                            if (storyIndex <= unlockedStory || storyIndex in completedStories) {
                                activeStory = storyIndex
                                stage = "story"
                                resumeParagraph = if (storyIndex == reading!!.progress.currentStoryIndex) {
                                    reading!!.progress.paragraphIndex
                                } else {
                                    0
                                }
                            }
                        },
                    )
                }

                unlockMessage?.let { message ->
                    item {
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            color = Color(0xFFFFFBEB),
                            shape = RoundedCornerShape(16.dp),
                            border = BorderStroke(1.dp, Color(0xFFFDE68A)),
                        ) {
                            Text(message, Modifier.padding(16.dp), color = PracticeAmber, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                when (stage) {
                    "complete" -> item {
                        Surface(
                            color = Color(0xFFFFFBEB),
                            shape = RoundedCornerShape(22.dp),
                            border = BorderStroke(1.dp, Color(0xFFFDE68A)),
                        ) {
                            Column(
                                Modifier.fillMaxWidth().padding(28.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                Text("🏆", fontSize = 54.sp)
                                Text("今日阅读任务已完成", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color(0xFF111827))
                                Text("三个故事、十五道阅读理解全部完成！", color = PracticeMuted, fontSize = 13.sp)
                                Text("⭐ ⭐ ⭐", modifier = Modifier.padding(vertical = 16.dp), fontSize = 30.sp)
                                Button(onClick = onBack) { Text("返回拼写首页") }
                            }
                        }
                    }
                    "story" -> {
                        item {
                            Surface(
                                color = Color(0xFFFAF5FF),
                                shape = RoundedCornerShape(18.dp),
                                border = BorderStroke(1.dp, Color(0xFFEDE9FE)),
                            ) {
                                Column(Modifier.padding(18.dp)) {
                                    Text("第 ${activeStory + 1} 关 · ${currentStory!!.theme}", color = PracticePurple, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    Text(currentStory.title, color = Color(0xFF111827), fontSize = 19.sp, fontWeight = FontWeight.Bold)
                                    if (resumeParagraph > 0) {
                                        Text(
                                            "上次读到这里啦，已经自动为你定位 👉",
                                            modifier = Modifier.padding(top = 10.dp),
                                            color = Color(0xFF0369A1),
                                            fontSize = 12.sp,
                                        )
                                    }
                                }
                            }
                        }
                        paragraphs.forEachIndexed { paragraphIndex, paragraph ->
                            item {
                                Surface(color = Color.White, shape = RoundedCornerShape(14.dp)) {
                                    Text(
                                        paragraph,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable {
                                                resumeParagraph = paragraphIndex
                                                scope.launch {
                                                    api.saveReadingProgress(activeStory, "story", paragraphIndex)
                                                }
                                            }
                                            .padding(14.dp),
                                        color = Color(0xFF0369A1),
                                        fontSize = 17.sp,
                                        lineHeight = 28.sp,
                                    )
                                }
                            }
                        }
                        item {
                            Column {
                                Text("轻点正在阅读的段落，可同步保存断点", color = Color(0xFF94A3B8), fontSize = 10.sp)
                                Spacer(Modifier.height(8.dp))
                                Button(
                                    modifier = Modifier.fillMaxWidth(),
                                    onClick = {
                                        stage = "questions"
                                        scope.launch {
                                            api.saveReadingProgress(activeStory, "questions", resumeParagraph)
                                        }
                                    },
                                ) {
                                    Text("故事读完了，开始答题")
                                }
                            }
                        }
                    }
                    else -> {
                        item {
                            Surface(color = Color(0xFFFAF5FF), shape = RoundedCornerShape(18.dp)) {
                                Column(Modifier.padding(18.dp)) {
                                    Text("第 ${activeStory + 1} 关 · 阅读理解", color = PracticePurple, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    Text(currentStory!!.title, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                                    TextButton(onClick = {
                                        stage = "story"
                                        resumeParagraph = 0
                                        scope.launch { api.saveReadingProgress(activeStory, "story", 0) }
                                    }) { Text("再读一遍故事") }
                                }
                            }
                        }
                        currentStory!!.questions.forEachIndexed { questionIndex, question ->
                            item {
                                val key = "$activeStory-$questionIndex"
                                ReadingQuestionBlock(
                                    number = questionIndex + 1,
                                    question = question.question,
                                    options = question.options,
                                    correctIndex = question.correctIndex,
                                    initialSelected = answerSelections[key],
                                    onSubmit = { selectedIndex, onReward ->
                                        answerSelections = answerSelections + (key to selectedIndex)
                                        scope.launch {
                                            try {
                                                val reward = api.submitReadingAnswer(activeStory, questionIndex, selectedIndex)
                                                onReward(reward)
                                                if (reward.storyCompleted) {
                                                    completedStories = completedStories + activeStory
                                                    if (reward.allCompleted || activeStory >= 2) {
                                                        unlockMessage = "🏆 恭喜你！三个阅读任务全部完成"
                                                        delay(1_200)
                                                        stage = "complete"
                                                    } else {
                                                        val nextStory = activeStory + 1
                                                        unlockedStory = nextStory
                                                        unlockMessage = "🌟 太棒了！第 ${nextStory + 1} 关已解锁"
                                                        api.saveReadingProgress(nextStory, "story", 0)
                                                        delay(1_200)
                                                        activeStory = nextStory
                                                        stage = "story"
                                                        resumeParagraph = 0
                                                        listState.animateScrollToItem(2)
                                                    }
                                                }
                                            } catch (_: Exception) {
                                                onReward(null)
                                            }
                                        }
                                    },
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
private fun ReadingLevelMap(
    reading: DailyReading,
    activeStory: Int,
    unlockedStory: Int,
    completedStories: Set<Int>,
    stage: String,
    onStory: (Int) -> Unit,
) {
    Surface(color = Color.White, shape = RoundedCornerShape(18.dp), border = BorderStroke(1.dp, Color(0xFFEDE9FE))) {
        Column(Modifier.padding(14.dp)) {
            Text("🗺️ 今日闯关地图", color = Color(0xFF334155), fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(10.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                reading.stories.forEachIndexed { index, story ->
                    val completed = index in completedStories
                    val unlocked = index <= unlockedStory || completed
                    val current = stage != "complete" && index == activeStory
                    Surface(
                        modifier = Modifier.weight(1f).clickable(enabled = unlocked) { onStory(index) },
                        color = when {
                            completed -> Color(0xFFFFFBEB)
                            current -> Color(0xFFFAF5FF)
                            else -> Color(0xFFF8FAFC)
                        },
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, if (current) Color(0xFFC4B5FD) else Color(0xFFE2E8F0)),
                    ) {
                        Column(Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(if (completed) "⭐" else if (unlocked) "🚩" else "🔒", fontSize = 20.sp)
                            Text("第 ${index + 1} 关", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            Text(story.theme, fontSize = 9.sp, color = PracticeMuted, maxLines = 1)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ReadingQuestionBlock(
    number: Int,
    question: String,
    options: List<String>,
    correctIndex: Int,
    initialSelected: Int?,
    onSubmit: (Int, (ReadingReward?) -> Unit) -> Unit,
) {
    var selected by remember(initialSelected) { mutableStateOf(initialSelected) }
    var reward by remember { mutableStateOf<ReadingReward?>(null) }
    var rewardFailed by remember { mutableStateOf(false) }
    Surface(color = Color.White, shape = RoundedCornerShape(15.dp)) {
        Column(Modifier.padding(14.dp)) {
            Text("$number. $question", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1F2937))
            Spacer(Modifier.height(7.dp))
            options.forEachIndexed { index, option ->
                val revealed = selected != null
                val isCorrect = index == correctIndex
                val isWrongChoice = selected == index && !isCorrect
                Surface(
                    modifier = Modifier.fillMaxWidth().clickable(enabled = !revealed) {
                        selected = index
                        onSubmit(index) { result ->
                            reward = result
                            rewardFailed = result == null
                        }
                    },
                    color = when {
                        revealed && isCorrect -> Color(0xFFECFDF5)
                        isWrongChoice -> Color(0xFFFFF1F2)
                        else -> Color(0xFFF8FAFC)
                    },
                    shape = RoundedCornerShape(11.dp),
                    border = BorderStroke(
                        1.dp,
                        when {
                            revealed && isCorrect -> Color(0xFF6EE7B7)
                            isWrongChoice -> Color(0xFFFDA4AF)
                            else -> Color(0xFFE2E8F0)
                        },
                    ),
                ) {
                    Text(
                        "${('A'.code + index).toChar()}. $option",
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                        color = when {
                            revealed && isCorrect -> PracticeSuccess
                            isWrongChoice -> PracticeDanger
                            else -> Color(0xFF334155)
                        },
                        fontSize = 13.sp,
                    )
                }
                Spacer(Modifier.height(6.dp))
            }
            reward?.let { result ->
                Text(
                    when {
                        result.pointsEarned > 0 && result.storyBonus > 0 -> "🌟 +${result.pointsEarned} 积分（含全对通关奖 +5）"
                        result.pointsEarned > 0 -> "🌟 +${result.pointsEarned} 积分"
                        result.alreadyRewarded -> "本题今日已结算过积分"
                        else -> "答错不扣分，继续加油"
                    },
                    color = if (result.pointsEarned > 0) PracticeAmber else PracticeMuted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
            if (rewardFailed) Text("积分结算失败，请稍后重试", color = PracticeDanger, fontSize = 11.sp)
        }
    }
}

private fun splitReadingParagraphs(content: String): List<String> {
    val sentences = content.split(Regex("(?<=[.!?])\\s+")).filter { it.isNotBlank() }
    return sentences.chunked(2).map { it.joinToString(" ") }.ifEmpty { listOf(content) }
}
