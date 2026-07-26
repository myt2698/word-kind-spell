package com.wordmind.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wordmind.app.data.PracticeWord
import com.wordmind.app.data.SpellingStats
import com.wordmind.app.data.WordMindApi
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

private val PracticeIndigo = Color(0xFF4F46E5)
private val PracticeMuted = Color(0xFF64748B)
private val PracticeSuccess = Color(0xFF059669)
private val PracticeDanger = Color(0xFFDC2626)

@Composable
internal fun PracticeScreen(
    api: WordMindApi,
    speak: (String) -> Unit,
    onMessage: (String) -> Unit,
    onLearningChanged: () -> Unit,
) {
    var queue by remember { mutableStateOf<List<PracticeWord>>(emptyList()) }
    var stats by remember { mutableStateOf<SpellingStats?>(null) }
    var loading by remember { mutableStateOf(true) }
    var submitting by remember { mutableStateOf(false) }
    var index by rememberSaveable { mutableIntStateOf(0) }
    var answer by rememberSaveable { mutableStateOf("") }
    var result by rememberSaveable { mutableStateOf<Boolean?>(null) }
    var startedAt by remember { mutableLongStateOf(System.currentTimeMillis()) }
    val scope = rememberCoroutineScope()

    suspend fun loadPractice() {
        loading = true
        try {
            val data = coroutineScope {
                val queueDeferred = async { api.getReviewQueue() }
                val statsDeferred = async { api.getSpellingStats() }
                queueDeferred.await() to statsDeferred.await()
            }
            queue = data.first
            stats = data.second
            index = 0
            answer = ""
            result = null
            startedAt = System.currentTimeMillis()
        } catch (error: Exception) {
            onMessage(error.message ?: "拼写数据加载失败")
        } finally {
            loading = false
        }
    }

    LaunchedEffect(Unit) {
        loadPractice()
    }

    val current = queue.getOrNull(index)
    LaunchedEffect(current?.id) {
        current?.let {
            startedAt = System.currentTimeMillis()
            speak(it.word)
        }
    }

    fun submit() {
        val word = current ?: return
        if (answer.isBlank() || result != null || submitting) return
        val correct = answer.trim().equals(word.word, ignoreCase = true)
        submitting = true
        scope.launch {
            try {
                api.submitSpellingResult(
                    wordId = word.id,
                    correct = correct,
                    userInput = answer.trim(),
                    durationMs = System.currentTimeMillis() - startedAt,
                )
                result = correct
                stats = stats?.copy(
                    dueForReview = (stats?.dueForReview ?: 1).minus(1).coerceAtLeast(0),
                )
                onLearningChanged()
            } catch (error: Exception) {
                onMessage(error.message ?: "提交练习结果失败")
            } finally {
                submitting = false
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(18.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text("拼写练习", fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Text("艾宾浩斯到期复习", color = PracticeMuted, fontSize = 13.sp)
            }
            IconButton(onClick = { scope.launch { loadPractice() } }, enabled = !loading) {
                Icon(Icons.Default.Refresh, contentDescription = "刷新练习")
            }
        }
        Spacer(Modifier.height(14.dp))
        StatsRow(stats)
        Spacer(Modifier.height(18.dp))

        when {
            loading -> {
                Spacer(Modifier.height(70.dp))
                CircularProgressIndicator()
            }
            current == null -> {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    border = CardDefaults.outlinedCardBorder(),
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 24.dp, vertical = 42.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Surface(
                            modifier = Modifier.size(64.dp),
                            shape = CircleShape,
                            color = Color(0xFFECFDF5),
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = PracticeSuccess,
                                    modifier = Modifier.size(34.dp),
                                )
                            }
                        }
                        Spacer(Modifier.height(16.dp))
                        Text("当前没有到期单词", fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(7.dp))
                        Text(
                            if ((stats?.learningWords ?: 0) == 0) {
                                "先到“单词”页把单词加入学习，随后即可开始拼写。"
                            } else {
                                "今天的到期任务已完成，稍后会按照记忆曲线安排下一次复习。"
                            },
                            color = PracticeMuted,
                            fontSize = 14.sp,
                            textAlign = TextAlign.Center,
                            lineHeight = 21.sp,
                        )
                    }
                }
            }
            else -> {
                Text(
                    "第 ${index + 1} / ${queue.size} 题",
                    color = PracticeMuted,
                    fontSize = 13.sp,
                )
                Spacer(Modifier.height(8.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    border = CardDefaults.outlinedCardBorder(),
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(22.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                shape = RoundedCornerShape(100.dp),
                                color = Color(0xFFEEF2FF),
                            ) {
                                Text(
                                    "等级 ${current.level}",
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                    color = PracticeIndigo,
                                    fontSize = 11.sp,
                                )
                            }
                            if (current.errorCount > 0) {
                                Spacer(Modifier.width(8.dp))
                                Text("错过 ${current.errorCount} 次", color = PracticeDanger, fontSize = 11.sp)
                            }
                        }
                        Spacer(Modifier.height(17.dp))
                        Text(
                            current.definition,
                            fontSize = 18.sp,
                            lineHeight = 27.sp,
                            textAlign = TextAlign.Center,
                            fontWeight = FontWeight.Medium,
                        )
                        Spacer(Modifier.height(12.dp))
                        OutlinedButton(
                            onClick = { speak(current.word) },
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.VolumeUp,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                            )
                            Spacer(Modifier.width(7.dp))
                            Text("再听一次")
                        }
                        Spacer(Modifier.height(20.dp))
                        OutlinedTextField(
                            value = answer,
                            onValueChange = {
                                if (result == null) answer = it.trimStart()
                            },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("输入英文单词") },
                            supportingText = {
                                Text("${current.word.length} 个字母", color = PracticeMuted)
                            },
                            singleLine = true,
                            enabled = result == null && !submitting,
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                            keyboardActions = KeyboardActions(onDone = { submit() }),
                            shape = RoundedCornerShape(14.dp),
                        )
                        Spacer(Modifier.height(13.dp))

                        if (result == null) {
                            Button(
                                onClick = { submit() },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(50.dp),
                                enabled = answer.isNotBlank() && !submitting,
                                shape = RoundedCornerShape(13.dp),
                            ) {
                                if (submitting) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(20.dp),
                                        color = Color.White,
                                        strokeWidth = 2.dp,
                                    )
                                } else {
                                    Text("提交答案")
                                }
                            }
                        } else {
                            ResultPanel(
                                correct = result == true,
                                correctWord = current.word,
                                userAnswer = answer,
                            )
                            Spacer(Modifier.height(12.dp))
                            Button(
                                onClick = {
                                    if (index < queue.lastIndex) {
                                        index += 1
                                        answer = ""
                                        result = null
                                    } else {
                                        scope.launch { loadPractice() }
                                    }
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(50.dp),
                                shape = RoundedCornerShape(13.dp),
                            ) {
                                Text(if (index < queue.lastIndex) "下一题" else "完成本轮")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatsRow(stats: SpellingStats?) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(15.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = CardDefaults.outlinedCardBorder(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 15.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            PracticeStat(stats?.learningWords ?: 0, "学习中")
            PracticeStat(stats?.dueForReview ?: 0, "待复习")
            PracticeStat(stats?.totalErrors ?: 0, "错题")
            PracticeStat(stats?.todaySessions ?: 0, "今日轮次")
        }
    }
}

@Composable
private fun PracticeStat(value: Int, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text("$value", fontSize = 19.sp, fontWeight = FontWeight.Bold, color = PracticeIndigo)
        Text(label, fontSize = 11.sp, color = PracticeMuted)
    }
}

@Composable
private fun ResultPanel(correct: Boolean, correctWord: String, userAnswer: String) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(13.dp),
        color = if (correct) Color(0xFFECFDF5) else Color(0xFFFEF2F2),
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                if (correct) Icons.Default.CheckCircle else Icons.Default.Close,
                contentDescription = null,
                tint = if (correct) PracticeSuccess else PracticeDanger,
            )
            Spacer(Modifier.width(10.dp))
            Column {
                Text(
                    if (correct) "拼写正确" else "正确答案：$correctWord",
                    color = if (correct) PracticeSuccess else PracticeDanger,
                    fontWeight = FontWeight.SemiBold,
                )
                if (!correct) {
                    Text("你的答案：$userAnswer", color = PracticeMuted, fontSize = 12.sp)
                }
            }
        }
    }
}
