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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wordmind.app.data.DailyReading
import com.wordmind.app.data.WordMindApi
import kotlinx.coroutines.delay

@Composable
@OptIn(ExperimentalLayoutApi::class)
internal fun DailyReadingMode(
    api: WordMindApi,
    onBack: () -> Unit,
) {
    var reading by remember { mutableStateOf<DailyReading?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var answeredQuestions by remember { mutableStateOf<Set<String>>(emptySet()) }
    var unlockedLevel by remember { mutableStateOf(0) }
    var unlockMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            reading = api.getDailyReading()
        } catch (exception: Exception) {
            error = exception.message ?: "加载失败"
        } finally {
            loading = false
        }
    }

    LaunchedEffect(answeredQuestions, reading) {
        val stories = reading?.stories ?: return@LaunchedEffect
        val completed = stories.getOrNull(unlockedLevel)?.questions?.indices?.all { questionIndex ->
            "$unlockedLevel-$questionIndex" in answeredQuestions
        } == true
        if (!completed) return@LaunchedEffect
        if (unlockedLevel < stories.lastIndex) {
            unlockedLevel += 1
            unlockMessage = "🌟 太棒了！第 ${unlockedLevel + 1} 关已解锁"
        } else {
            unlockMessage = "🏆 恭喜你！三个阅读任务全部完成"
        }
    }

    LaunchedEffect(unlockMessage) {
        if (unlockMessage == null) return@LaunchedEffect
        delay(2_600)
        unlockMessage = null
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp, 16.dp, 16.dp, 40.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
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
                            Text("三种不同主题 · 自然拼读音节标注 · 每篇 5 题", fontSize = 11.sp, color = PracticeMuted)
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
        unlockMessage?.let { message ->
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = Color(0xFFFFFBEB),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, Color(0xFFFDE68A)),
                ) {
                    Text(
                        message,
                        modifier = Modifier.padding(16.dp),
                        color = PracticeAmber,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                    )
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
            else -> reading!!.stories.forEachIndexed { storyIndex, story ->
                item {
                    if (storyIndex <= unlockedLevel) {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            shape = RoundedCornerShape(18.dp),
                            border = BorderStroke(1.dp, Color(0xFFEDE9FE)),
                        ) {
                            Column(Modifier.padding(18.dp)) {
                                Text("第 ${storyIndex + 1} 关 · ${story.theme}", color = PracticePurple, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                Text(story.title, color = Color(0xFF111827), fontSize = 19.sp, fontWeight = FontWeight.Bold)
                                Spacer(Modifier.height(14.dp))
                                Text(story.content, color = Color(0xFF0369A1), fontSize = 17.sp, lineHeight = 28.sp)
                                Text("带连字符的词为自然拼读音节拆分", color = Color(0xFF94A3B8), fontSize = 10.sp)
                                Spacer(Modifier.height(18.dp))
                                story.questions.forEachIndexed { questionIndex, question ->
                                    ReadingQuestionBlock(
                                        number = questionIndex + 1,
                                        question = question.question,
                                        options = question.options,
                                        correctIndex = question.correctIndex,
                                        onAnswered = {
                                            answeredQuestions = answeredQuestions + "$storyIndex-$questionIndex"
                                        },
                                    )
                                    if (questionIndex < story.questions.lastIndex) Spacer(Modifier.height(18.dp))
                                }
                            }
                        }
                    } else {
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            color = Color(0xFFF8FAFC),
                            shape = RoundedCornerShape(18.dp),
                            border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                        ) {
                            Row(
                                modifier = Modifier.padding(20.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFF94A3B8))
                                Spacer(Modifier.padding(7.dp))
                                Column {
                                    Text("第 ${storyIndex + 1} 关尚未解锁", color = Color(0xFF64748B), fontWeight = FontWeight.Bold)
                                    Text("完成上一关的 5 道阅读理解题即可解锁", color = Color(0xFF94A3B8), fontSize = 11.sp)
                                }
                            }
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
    onAnswered: () -> Unit,
) {
    var selected by remember { mutableStateOf<Int?>(null) }
    Text("$number. $question", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1F2937))
    Spacer(Modifier.height(7.dp))
    options.forEachIndexed { index, option ->
        val revealed = selected != null
        val isCorrect = index == correctIndex
        val isWrongChoice = selected == index && !isCorrect
        val background = when {
            revealed && isCorrect -> Color(0xFFECFDF5)
            isWrongChoice -> Color(0xFFFFF1F2)
            else -> Color(0xFFF8FAFC)
        }
        val border = when {
            revealed && isCorrect -> Color(0xFF6EE7B7)
            isWrongChoice -> Color(0xFFFDA4AF)
            else -> Color(0xFFE2E8F0)
        }
        Surface(
            modifier = Modifier.fillMaxWidth().clickable(enabled = !revealed) {
                selected = index
                onAnswered()
            },
            color = background,
            shape = RoundedCornerShape(11.dp),
            border = BorderStroke(1.dp, border),
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
}
