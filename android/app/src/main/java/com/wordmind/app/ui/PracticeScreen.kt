package com.wordmind.app.ui

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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CheckBox
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Extension
import androidx.compose.material.icons.filled.Headphones
import androidx.compose.material.icons.filled.Keyboard
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Whatshot
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Weekend
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.wordmind.app.data.PracticeWord
import com.wordmind.app.data.SpellingReward
import com.wordmind.app.data.SpellingStats
import com.wordmind.app.data.Textbook
import com.wordmind.app.data.Word
import com.wordmind.app.data.WordMindApi
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

internal val PracticeIndigo = Color(0xFF4F46E5)
internal val PracticeMuted = Color(0xFF64748B)
internal val PracticeSuccess = Color(0xFF059669)
internal val PracticeDanger = Color(0xFFDC2626)
internal val PracticeAmber = Color(0xFFD97706)
internal val PracticePurple = Color(0xFF9333EA)

internal enum class PracticeView {
    Home,
    Study,
    Reading,
    Blocks,
    FillBlank,
    Flash,
    Dictation,
    Rest,
}

private enum class StatDialogType {
    Learning,
    New,
    Review,
    Errors,
}

private enum class PracticeSourceMode {
    Review,
    Challenge,
    Revenge,
}

@Composable
internal fun PracticeScreen(
    api: WordMindApi,
    catalogWords: List<Word>,
    textbooks: List<Textbook>,
    speak: (String) -> Unit,
    onMessage: (String) -> Unit,
    onLearningChanged: () -> Unit,
    onSecondaryPageChanged: (Boolean) -> Unit,
) {
    var learningWords by remember { mutableStateOf<List<PracticeWord>>(emptyList()) }
    var reviewWords by remember { mutableStateOf<List<PracticeWord>>(emptyList()) }
    var errorWords by remember { mutableStateOf<List<PracticeWord>>(emptyList()) }
    var selectedIds by remember { mutableStateOf<Set<Int>>(emptySet()) }
    var stats by remember { mutableStateOf<SpellingStats?>(null) }
    var loading by remember { mutableStateOf(true) }
    var savingSelection by remember { mutableStateOf(false) }
    var selectionOpen by remember { mutableStateOf(false) }
    var statDialog by remember { mutableStateOf<StatDialogType?>(null) }
    var view by rememberSaveable { mutableStateOf(PracticeView.Home) }
    var practiceSource by rememberSaveable {
        mutableStateOf(PracticeSourceMode.Challenge)
    }
    val scope = rememberCoroutineScope()

    LaunchedEffect(view) {
        onSecondaryPageChanged(view != PracticeView.Home)
    }

    suspend fun loadPractice(showLoading: Boolean = true) {
        if (showLoading) loading = true
        try {
            val result = coroutineScope {
                val learning = async { api.getLearningQueue() }
                val review = async { api.getReviewQueue() }
                val errors = async { api.getErrorWords() }
                val spellingStats = async { api.getSpellingStats() }
                val todaySelections = async { api.getTodaySelections() }
                PracticeLoadResult(
                    learning = learning.await(),
                    review = review.await(),
                    errors = errors.await(),
                    stats = spellingStats.await(),
                    selectedIds = todaySelections.await().toSet(),
                )
            }
            val catalogById = catalogWords.associateBy { it.id }
            learningWords = result.learning.map { it.withCatalogDetails(catalogById[it.id]) }
            reviewWords = result.review.map { it.withCatalogDetails(catalogById[it.id]) }
            errorWords = result.errors.map { it.withCatalogDetails(catalogById[it.id]) }
            stats = result.stats
            val activeIds = result.learning.mapTo(mutableSetOf()) { it.id }
            selectedIds = result.selectedIds.intersect(activeIds)
            if (result.review.isNotEmpty() && practiceSource == PracticeSourceMode.Challenge) {
                practiceSource = PracticeSourceMode.Review
            }
        } catch (error: Exception) {
            error.rethrowIfCancellation()
            onMessage(error.message ?: "拼写数据加载失败")
        } finally {
            loading = false
        }
    }

    LaunchedEffect(Unit) {
        loadPractice()
    }

    LaunchedEffect(catalogWords) {
        if (catalogWords.isNotEmpty()) {
            val catalogById = catalogWords.associateBy { it.id }
            learningWords = learningWords.map { it.withCatalogDetails(catalogById[it.id]) }
            reviewWords = reviewWords.map { it.withCatalogDetails(catalogById[it.id]) }
            errorWords = errorWords.map { it.withCatalogDetails(catalogById[it.id]) }
        }
    }

    val selectedWords = remember(learningWords, selectedIds) {
        learningWords.filter { it.id in selectedIds }
    }
    val practiceWords = when (practiceSource) {
        PracticeSourceMode.Review -> reviewWords
        PracticeSourceMode.Challenge -> selectedWords
        PracticeSourceMode.Revenge -> errorWords
    }

    fun openMode(mode: PracticeView) {
        if (mode == PracticeView.Rest) {
            view = mode
            return
        }
        if (practiceWords.isNotEmpty()) {
            view = mode
        } else if (practiceSource == PracticeSourceMode.Challenge) {
            selectionOpen = true
        } else if (practiceSource == PracticeSourceMode.Review) {
            statDialog = StatDialogType.Review
        } else {
            statDialog = StatDialogType.Errors
        }
    }

    fun saveSelection(ids: Set<Int>) {
        if (savingSelection) return
        val previous = selectedIds
        selectedIds = ids
        selectionOpen = false
        savingSelection = true
        scope.launch {
            try {
                api.setTodaySelections(ids.toList())
            } catch (error: Exception) {
                error.rethrowIfCancellation()
                selectedIds = previous
                onMessage(error.message ?: "今日练习单词保存失败")
            } finally {
                savingSelection = false
            }
        }
    }

    fun submitResult(
        word: PracticeWord,
        correct: Boolean,
        input: String,
        mode: String,
        durationMs: Long,
        onReward: (SpellingReward) -> Unit,
    ) {
        scope.launch {
            try {
                val reward = api.submitSpellingResult(
                    wordId = word.id,
                    correct = correct,
                    userInput = input,
                    durationMs = durationMs,
                    practiceMode = mode,
                )
                onReward(reward)
                if (reward.pointsEarned > 0) {
                    stats = stats?.copy(
                        totalPoints = stats?.totalPoints?.plus(reward.pointsEarned)
                            ?: reward.pointsEarned,
                        todayPoints = stats?.todayPoints?.plus(reward.pointsEarned)
                            ?: reward.pointsEarned,
                    )
                }
                onLearningChanged()
            } catch (error: Exception) {
                error.rethrowIfCancellation()
                onMessage(error.message ?: "提交练习结果失败")
            }
        }
    }

    fun returnHome() {
        view = PracticeView.Home
        scope.launch { loadPractice(showLoading = false) }
    }

    when (view) {
        PracticeView.Home -> PracticeHome(
            loading = loading,
            learningWords = learningWords,
            reviewWords = reviewWords,
            errorWords = errorWords,
            selectedWords = selectedWords,
            stats = stats,
            practiceSource = practiceSource,
            onPracticeSourceChange = { practiceSource = it },
            onSelectWords = { selectionOpen = true },
            onMode = ::openMode,
        )
        PracticeView.Study -> TodayStudyMode(
            words = selectedWords,
            catalogWords = catalogWords,
            speak = speak,
            onBack = ::returnHome,
        )
        PracticeView.Reading -> DailyReadingMode(
            api = api,
            onBack = { view = PracticeView.Home },
        )
        PracticeView.Blocks -> BlocksPracticeMode(
            words = practiceWords,
            speak = speak,
            onBack = ::returnHome,
            onSubmit = ::submitResult,
        )
        PracticeView.FillBlank -> FillBlankPracticeMode(
            words = practiceWords,
            speak = speak,
            onBack = ::returnHome,
            onSubmit = ::submitResult,
        )
        PracticeView.Flash -> FlashPracticeMode(
            words = practiceWords,
            speak = speak,
            onBack = ::returnHome,
            onSubmit = ::submitResult,
        )
        PracticeView.Dictation -> DictationPracticeMode(
            words = practiceWords,
            speak = speak,
            onBack = ::returnHome,
        )
        PracticeView.Rest -> RestMode(
            api = api,
            onBack = { view = PracticeView.Home },
            onMessage = onMessage,
        )
    }

    if (selectionOpen) {
        PracticeWordSelectionDialog(
            words = learningWords,
            catalogWords = catalogWords,
            textbooks = textbooks,
            initialSelected = selectedIds,
            saving = savingSelection,
            onDismiss = { selectionOpen = false },
            onConfirm = ::saveSelection,
        )
    }

    statDialog?.let { type ->
        val dialogWords = when (type) {
            StatDialogType.Learning -> learningWords
            StatDialogType.New -> reviewWords.filter {
                it.source == "manual" && it.totalAttempts == 0
            }
            StatDialogType.Review -> reviewWords
            StatDialogType.Errors -> errorWords
        }
        PracticeWordListDialog(
            title = when (type) {
                StatDialogType.Learning -> "学习中的单词"
                StatDialogType.New -> "新学单词"
                StatDialogType.Review -> "待复习队列"
                StatDialogType.Errors -> "错题本"
            },
            words = dialogWords,
            allowErrorRemoval = type == StatDialogType.Errors,
            onRemoveError = { word ->
                scope.launch {
                    try {
                        api.clearSpellingErrors(word.id)
                        loadPractice(showLoading = false)
                    } catch (error: Exception) {
                        error.rethrowIfCancellation()
                        onMessage(error.message ?: "移除错题失败")
                    }
                }
            },
            onDismiss = { statDialog = null },
        )
    }
}

private data class PracticeLoadResult(
    val learning: List<PracticeWord>,
    val review: List<PracticeWord>,
    val errors: List<PracticeWord>,
    val stats: SpellingStats,
    val selectedIds: Set<Int>,
)

private fun PracticeWord.withCatalogDetails(catalogWord: Word?): PracticeWord {
    if (catalogWord == null) return this
    return copy(
        phonetic = catalogWord.phonetic ?: phonetic,
        definition = catalogWord.definition.ifBlank { definition },
        example = catalogWord.example ?: example,
        notes = catalogWord.notes ?: notes,
        tags = catalogWord.tags.ifEmpty { tags },
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PracticeHome(
    loading: Boolean,
    learningWords: List<PracticeWord>,
    reviewWords: List<PracticeWord>,
    errorWords: List<PracticeWord>,
    selectedWords: List<PracticeWord>,
    stats: SpellingStats?,
    practiceSource: PracticeSourceMode,
    onPracticeSourceChange: (PracticeSourceMode) -> Unit,
    onSelectWords: () -> Unit,
    onMode: (PracticeView) -> Unit,
) {
    val practiceWordCount = when (practiceSource) {
        PracticeSourceMode.Review -> reviewWords.size
        PracticeSourceMode.Challenge -> selectedWords.size
        PracticeSourceMode.Revenge -> errorWords.size
    }
    val hasPracticeWords = practiceWordCount > 0
    val emptyPracticeText = when (practiceSource) {
        PracticeSourceMode.Review -> "今天的复习已经完成"
        PracticeSourceMode.Challenge -> "请先选择今日练习单词"
        PracticeSourceMode.Revenge -> "错题本里还没有需要复习的单词"
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 24.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.Default.School,
                contentDescription = null,
                tint = PracticeIndigo,
                modifier = Modifier.size(23.dp),
            )
            Spacer(Modifier.width(8.dp))
            Text("单词拼写", fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.weight(1f))
            Surface(
                color = Color(0xFFFFFBEB),
                shape = RoundedCornerShape(999.dp),
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    Color(0xFFFDE68A),
                ),
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Default.EmojiEvents,
                        contentDescription = null,
                        tint = PracticeAmber,
                        modifier = Modifier.size(14.dp),
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(
                        "${stats?.totalPoints ?: 0} 积分",
                        color = PracticeAmber,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    if ((stats?.todayPoints ?: 0) > 0) {
                        Spacer(Modifier.width(5.dp))
                        Text(
                            "今日 +${stats?.todayPoints}",
                            color = Color(0xFFF59E0B),
                            fontSize = 9.sp,
                        )
                    }
                }
            }
        }
        Spacer(Modifier.height(3.dp))
        Text("先复习到期单词，再学今日新词，最后巩固错词", color = PracticeMuted, fontSize = 13.sp)
        Spacer(Modifier.height(18.dp))

        if (loading) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator()
            }
            return
        }

        Card(
            onClick = {
                onPracticeSourceChange(PracticeSourceMode.Review)
                if (reviewWords.isNotEmpty()) onMode(PracticeView.Blocks)
            },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = if (reviewWords.isEmpty()) Color(0xFFECFDF5) else Color(0xFFFFFBEB),
            ),
            border = androidx.compose.foundation.BorderStroke(
                1.dp,
                if (reviewWords.isEmpty()) Color(0xFFA7F3D0) else Color(0xFFFDE68A),
            ),
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    if (reviewWords.isEmpty()) Icons.Default.CheckBox else Icons.Default.Schedule,
                    contentDescription = null,
                    tint = if (reviewWords.isEmpty()) PracticeSuccess else PracticeAmber,
                    modifier = Modifier.size(28.dp),
                )
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        if (reviewWords.isEmpty()) "今日复习已完成" else "先完成今日复习（${reviewWords.size} 个）",
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        if (reviewWords.isEmpty()) "可以开始学习今天的新单词啦" else "按到期时间优先，每天最多安排 10 个",
                        color = PracticeMuted,
                        fontSize = 12.sp,
                    )
                }
                if (reviewWords.isNotEmpty()) {
                    Icon(Icons.Default.ChevronRight, contentDescription = null, tint = PracticeAmber)
                }
            }
        }
        Spacer(Modifier.height(18.dp))

        Card(
            onClick = {
                if (selectedWords.isEmpty()) {
                    onSelectWords()
                } else {
                    onMode(PracticeView.Study)
                }
            },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFF)),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFC7D2FE)),
        ) {
            Column(Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Default.CalendarMonth,
                        contentDescription = null,
                        tint = PracticeIndigo,
                        modifier = Modifier.size(21.dp),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "今日练习",
                        modifier = Modifier.weight(1f),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    TextButton(onClick = onSelectWords) {
                        Text(if (selectedWords.isEmpty()) "去选词" else "重新选词", fontSize = 12.sp)
                    }
                }
                if (selectedWords.isEmpty()) {
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "还没有选择今日练习单词",
                        modifier = Modifier.fillMaxWidth(),
                        color = Color(0xFF94A3B8),
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center,
                    )
                    Spacer(Modifier.height(7.dp))
                    Button(
                        onClick = onSelectWords,
                        modifier = Modifier.align(Alignment.CenterHorizontally),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 4.dp),
                    ) {
                        Icon(
                            Icons.Default.CheckBox,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                        )
                        Spacer(Modifier.width(5.dp))
                        Text("选择单词", fontSize = 12.sp)
                    }
                } else {
                    Text(
                        "已选 ${selectedWords.size} 个单词 · 点击卡片按顺序学习",
                        color = PracticeMuted,
                        fontSize = 12.sp,
                    )
                    Spacer(Modifier.height(9.dp))
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                        maxLines = 3,
                    ) {
                        selectedWords.take(15).forEach { word ->
                            Surface(
                                color = Color(0xFFEEF2FF),
                                shape = RoundedCornerShape(100.dp),
                                border = CardDefaults.outlinedCardBorder(),
                            ) {
                                Text(
                                    word.word,
                                    modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp),
                                    color = PracticeIndigo,
                                    fontSize = 11.sp,
                                )
                            }
                        }
                        if (selectedWords.size > 15) {
                            Text(
                                "+${selectedWords.size - 15}",
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                color = PracticeMuted,
                                fontSize = 11.sp,
                            )
                        }
                    }
                    Spacer(Modifier.height(13.dp))
                    HorizontalDivider(color = Color(0xFFE0E7FF))
                    Spacer(Modifier.height(11.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Surface(
                            color = Color(0xFFE0E7FF),
                            shape = RoundedCornerShape(10.dp),
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.MenuBook,
                                contentDescription = null,
                                tint = PracticeIndigo,
                                modifier = Modifier
                                    .padding(8.dp)
                                    .size(18.dp),
                            )
                        }
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                "开始顺序学习",
                                color = PracticeIndigo,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                "自动朗读 · 单词详情 · 自然拼读",
                                color = Color(0xFF818CF8),
                                fontSize = 11.sp,
                            )
                        }
                        Icon(
                            Icons.Default.ChevronRight,
                            contentDescription = null,
                            tint = PracticeIndigo,
                        )
                    }
                }
            }
        }
        Spacer(Modifier.height(20.dp))

        PracticeModeCard(
            title = "今日单词趣味阅读",
            description = if (selectedWords.isEmpty()) {
                "选择今日单词后生成趣味短文"
            } else {
                "3 篇不同主题短文 · 音节标注 · 阅读理解"
            },
            icon = Icons.AutoMirrored.Filled.MenuBook,
            color = PracticePurple,
            background = Color(0xFFFAF5FF),
            enabled = selectedWords.isNotEmpty(),
            onClick = { onMode(PracticeView.Reading) },
        )
        Spacer(Modifier.height(20.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "选择练习模式",
                modifier = Modifier.weight(1f),
                color = Color(0xFF334155),
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Text("$practiceWordCount 个单词", color = Color(0xFF94A3B8), fontSize = 11.sp)
        }
        Spacer(Modifier.height(10.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            PracticeSourceCard(
                title = "今日复习",
                description = "${reviewWords.size} 个到期单词",
                count = reviewWords.size,
                icon = Icons.Default.Schedule,
                color = PracticeAmber,
                background = Color(0xFFFFFBEB),
                selected = practiceSource == PracticeSourceMode.Review,
                onClick = { onPracticeSourceChange(PracticeSourceMode.Review) },
                modifier = Modifier.weight(1f),
            )
            PracticeSourceCard(
                title = "闯关模式",
                description = "准备好接受今天的挑战了吗？",
                count = selectedWords.size,
                icon = Icons.Default.EmojiEvents,
                color = PracticeIndigo,
                background = Color(0xFFEEF2FF),
                selected = practiceSource == PracticeSourceMode.Challenge,
                onClick = {
                    onPracticeSourceChange(PracticeSourceMode.Challenge)
                },
                modifier = Modifier.weight(1f),
            )
            PracticeSourceCard(
                title = "复仇之战",
                description = "把曾经难倒你的单词通通拿下！",
                count = errorWords.size,
                icon = Icons.Default.Whatshot,
                color = Color(0xFFE11D48),
                background = Color(0xFFFFF1F2),
                selected = practiceSource == PracticeSourceMode.Revenge,
                onClick = {
                    onPracticeSourceChange(PracticeSourceMode.Revenge)
                },
                modifier = Modifier.weight(1f),
            )
        }
        Spacer(Modifier.height(10.dp))
        PracticeModeCard(
            title = "积木拼拼乐",
            description = if (!hasPracticeWords) {
                emptyPracticeText
            } else {
                "点击字母积木拼出正确单词"
            },
            icon = Icons.Default.Extension,
            color = PracticeIndigo,
            background = Color(0xFFEEF2FF),
            enabled = hasPracticeWords,
            onClick = { onMode(PracticeView.Blocks) },
        )
        Spacer(Modifier.height(10.dp))
        PracticeModeCard(
            title = "单词消消乐",
            description = if (!hasPracticeWords) {
                emptyPracticeText
            } else {
                "根据提示填写缺失的字母"
            },
            icon = Icons.Default.Keyboard,
            color = PracticeSuccess,
            background = Color(0xFFECFDF5),
            enabled = hasPracticeWords,
            onClick = { onMode(PracticeView.FillBlank) },
        )
        Spacer(Modifier.height(10.dp))
        PracticeModeCard(
            title = "极速闪电战",
            description = if (!hasPracticeWords) {
                emptyPracticeText
            } else {
                "限时快速拼写挑战"
            },
            icon = Icons.Default.Bolt,
            color = PracticeAmber,
            background = Color(0xFFFFFBEB),
            enabled = hasPracticeWords,
            onClick = { onMode(PracticeView.Flash) },
        )
        Spacer(Modifier.height(10.dp))
        PracticeModeCard(
            title = "听写模式",
            description = if (!hasPracticeWords) {
                emptyPracticeText
            } else {
                "单词读两遍，再读最短例句"
            },
            icon = Icons.Default.Headphones,
            color = PracticePurple,
            background = Color(0xFFFAF5FF),
            enabled = hasPracticeWords,
            onClick = { onMode(PracticeView.Dictation) },
        )
        Spacer(Modifier.height(24.dp))
        HorizontalDivider(color = Color(0xFFF1F5F9))
        Spacer(Modifier.height(12.dp))
        Card(
            onClick = { onMode(PracticeView.Rest) },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Color.Transparent),
            elevation = CardDefaults.cardElevation(0.dp),
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Surface(color = Color(0xFFF5F3FF), shape = RoundedCornerShape(12.dp)) {
                    Icon(
                        Icons.Default.Weekend,
                        contentDescription = null,
                        tint = Color(0xFFA78BFA),
                        modifier = Modifier.padding(10.dp).size(20.dp),
                    )
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text("休息小站", color = Color(0xFF475569), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    Text("想休息时，自己选择一部动画短片", color = Color(0xFF94A3B8), fontSize = 11.sp)
                }
                Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(18.dp))
            }
        }
    }
}

@Composable
private fun PracticeSourceCard(
    title: String,
    description: String,
    count: Int,
    icon: ImageVector,
    color: Color,
    background: Color,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (selected) background else Color.White,
        ),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (selected) color.copy(alpha = 0.45f) else Color(0xFFE2E8F0),
        ),
    ) {
        Column(Modifier.padding(horizontal = 12.dp, vertical = 11.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    title,
                    modifier = Modifier.weight(1f),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                )
                Text("$count", color = color, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(5.dp))
            Text(
                description,
                color = PracticeMuted,
                fontSize = 10.sp,
                lineHeight = 14.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun PracticeModeCard(
    title: String,
    description: String,
    icon: ImageVector,
    color: Color,
    background: Color,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Card(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = CardDefaults.outlinedCardBorder(),
    ) {
        Row(
            modifier = Modifier.padding(15.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(
                modifier = Modifier.size(48.dp),
                shape = RoundedCornerShape(13.dp),
                color = background,
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = null, tint = color)
                }
            }
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f)) {
                Text(title, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(3.dp))
                Text(description, color = PracticeMuted, fontSize = 12.sp)
            }
            Icon(
                Icons.Default.PlayArrow,
                contentDescription = null,
                tint = if (enabled) color.copy(alpha = 0.65f) else Color(0xFFCBD5E1),
            )
        }
    }
}

@Composable
private fun PracticeWordSelectionDialog(
    words: List<PracticeWord>,
    catalogWords: List<Word>,
    textbooks: List<Textbook>,
    initialSelected: Set<Int>,
    saving: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (Set<Int>) -> Unit,
) {
    var selected by remember(initialSelected) { mutableStateOf(initialSelected) }
    var selectedTextbookId by remember { mutableStateOf<Int?>(null) }
    var selectedUnitId by remember { mutableStateOf<Int?>(null) }
    var selectedLevel by remember { mutableStateOf<Int?>(null) }
    val units = remember(textbooks, selectedTextbookId) {
        textbooks.firstOrNull { it.id == selectedTextbookId }?.groups.orEmpty()
    }
    val catalogById = remember(catalogWords) { catalogWords.associateBy { it.id } }
    val filteredWords = remember(
        words,
        catalogById,
        selectedTextbookId,
        selectedUnitId,
        selectedLevel,
    ) {
        words.filter { practiceWord ->
            val catalogWord = catalogById[practiceWord.id]
            val matchesTextbook = selectedTextbookId == null ||
                catalogWord?.textbookId == selectedTextbookId ||
                catalogWord?.groups?.any { it.textbookId == selectedTextbookId } == true
            val matchesUnit = selectedUnitId == null ||
                catalogWord?.groupId == selectedUnitId ||
                catalogWord?.groups?.any { it.groupId == selectedUnitId } == true
            val matchesLevel = selectedLevel == null || practiceWord.level == selectedLevel
            matchesTextbook && matchesUnit && matchesLevel
        }
    }
    val filteredIds = remember(filteredWords) {
        filteredWords.mapTo(mutableSetOf()) { it.id }
    }
    val allSelected = filteredWords.isNotEmpty() && selected.containsAll(filteredIds)
    val hasFilters =
        selectedTextbookId != null || selectedUnitId != null || selectedLevel != null

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.86f),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
        ) {
            Column(Modifier.fillMaxSize()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 18.dp, vertical = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Default.CheckBox,
                        contentDescription = null,
                        tint = PracticeIndigo,
                        modifier = Modifier.size(20.dp),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "选择今日练习单词",
                        modifier = Modifier.weight(1f),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text("${selected.size} 已选", color = PracticeMuted, fontSize = 11.sp)
                }
                HorizontalDivider()
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PracticeFilterDropdown(
                            allLabel = "全部课本",
                            selectedId = selectedTextbookId,
                            options = textbooks.map { it.id to it.name },
                            modifier = Modifier.weight(1f),
                            onSelect = {
                                selectedTextbookId = it
                                selectedUnitId = null
                            },
                        )
                        PracticeFilterDropdown(
                            allLabel = "全部单元",
                            selectedId = selectedUnitId,
                            options = units.map { it.id to it.name },
                            modifier = Modifier.weight(1f),
                            enabled = selectedTextbookId != null,
                            onSelect = { selectedUnitId = it },
                        )
                    }
                    PracticeFilterDropdown(
                        allLabel = "全部等级",
                        selectedId = selectedLevel,
                        options = listOf(
                            1 to "Lv.1 新学",
                            2 to "Lv.2 复习中",
                            3 to "Lv.3 已熟悉",
                        ),
                        modifier = Modifier.fillMaxWidth(),
                        onSelect = { selectedLevel = it },
                    )
                }
                HorizontalDivider()
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(
                        onClick = {
                            selected = if (allSelected) {
                                selected - filteredIds
                            } else {
                                filteredIds
                            }
                        },
                        enabled = filteredIds.isNotEmpty(),
                    ) {
                        Text(
                            if (allSelected) "取消当前全选" else "全选当前结果",
                            fontSize = 12.sp,
                        )
                    }
                    Spacer(Modifier.weight(1f))
                    Text(
                        if (hasFilters) {
                            "${filteredWords.size} / ${words.size} 个单词"
                        } else {
                            "${words.size} 个单词"
                        },
                        color = PracticeMuted,
                        fontSize = 11.sp,
                    )
                }
                HorizontalDivider()
                if (filteredWords.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            if (hasFilters) {
                                "当前筛选条件下暂无学习中的单词"
                            } else {
                                "暂无学习中的单词"
                            },
                            color = PracticeMuted,
                            fontSize = 13.sp,
                        )
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(12.dp),
                        verticalArrangement = Arrangement.spacedBy(7.dp),
                    ) {
                        items(filteredWords, key = { it.id }) { word ->
                            val checked = word.id in selected
                            Card(
                                onClick = {
                                    selected = if (checked) {
                                        selected - word.id
                                    } else {
                                        selected + word.id
                                    }
                                },
                                colors = CardDefaults.cardColors(
                                    containerColor = if (checked) {
                                        Color(0xFFEEF2FF)
                                    } else {
                                        Color.White
                                    },
                                ),
                                border = CardDefaults.outlinedCardBorder(),
                                shape = RoundedCornerShape(13.dp),
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 10.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Checkbox(
                                        checked = checked,
                                        onCheckedChange = {
                                            selected = if (checked) {
                                                selected - word.id
                                            } else {
                                                selected + word.id
                                            }
                                        },
                                    )
                                    Column(Modifier.weight(1f)) {
                                        Text(word.word, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                        Text(
                                            word.definition,
                                            color = PracticeMuted,
                                            fontSize = 11.sp,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                        )
                                    }
                                    Surface(
                                        color = when (word.level) {
                                            1 -> Color(0xFFFEE2E2)
                                            2 -> Color(0xFFFEF3C7)
                                            else -> Color(0xFFD1FAE5)
                                        },
                                        shape = RoundedCornerShape(100.dp),
                                    ) {
                                        Text(
                                            "Lv.${word.level}",
                                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
                                            color = when (word.level) {
                                                1 -> PracticeDanger
                                                2 -> PracticeAmber
                                                else -> PracticeSuccess
                                            },
                                            fontSize = 10.sp,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
                HorizontalDivider()
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f),
                    ) {
                        Text("取消")
                    }
                    Button(
                        onClick = { onConfirm(selected) },
                        modifier = Modifier.weight(1f),
                        enabled = !saving,
                    ) {
                        if (saving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                color = Color.White,
                                strokeWidth = 2.dp,
                            )
                        } else {
                            Text("确认 (${selected.size} 个)")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PracticeFilterDropdown(
    allLabel: String,
    selectedId: Int?,
    options: List<Pair<Int, String>>,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onSelect: (Int?) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedLabel = options.firstOrNull { it.first == selectedId }?.second ?: allLabel

    Box(modifier) {
        OutlinedButton(
            onClick = { expanded = true },
            enabled = enabled,
            modifier = Modifier.fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
            shape = RoundedCornerShape(10.dp),
        ) {
            Text(
                selectedLabel,
                modifier = Modifier.weight(1f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                fontSize = 12.sp,
                textAlign = TextAlign.Start,
            )
            Icon(
                Icons.Default.ArrowDropDown,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
            )
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            DropdownMenuItem(
                text = { Text(allLabel, fontSize = 13.sp) },
                onClick = {
                    expanded = false
                    onSelect(null)
                },
            )
            options.forEach { (id, label) ->
                DropdownMenuItem(
                    text = {
                        Text(
                            label,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            fontSize = 13.sp,
                        )
                    },
                    onClick = {
                        expanded = false
                        onSelect(id)
                    },
                )
            }
        }
    }
}

@Composable
private fun PracticeWordListDialog(
    title: String,
    words: List<PracticeWord>,
    allowErrorRemoval: Boolean,
    onRemoveError: (PracticeWord) -> Unit,
    onDismiss: () -> Unit,
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.72f),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
        ) {
            Column(Modifier.fillMaxSize()) {
                Row(
                    modifier = Modifier.padding(horizontal = 18.dp, vertical = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        title,
                        modifier = Modifier.weight(1f),
                        fontSize = 17.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text("${words.size} 个", color = PracticeMuted, fontSize = 11.sp)
                }
                HorizontalDivider()
                if (words.isEmpty()) {
                    Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Text("暂无相关单词", color = PracticeMuted)
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(12.dp),
                        verticalArrangement = Arrangement.spacedBy(7.dp),
                    ) {
                        items(words, key = { it.id }) { word ->
                            Surface(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                color = Color(0xFFF8FAFC),
                                border = CardDefaults.outlinedCardBorder(),
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Column(Modifier.weight(1f)) {
                                        Text(word.word, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                        word.phonetic?.let {
                                            Text(it, color = PracticeMuted, fontSize = 10.sp)
                                        }
                                    }
                                    if (allowErrorRemoval) {
                                        Surface(
                                            color = when (word.level) {
                                                1 -> Color(0xFFFEE2E2)
                                                2 -> Color(0xFFFEF3C7)
                                                else -> Color(0xFFD1FAE5)
                                            },
                                            shape = CircleShape,
                                        ) {
                                            Text(
                                                "Lv.${word.level}",
                                                modifier = Modifier.padding(
                                                    horizontal = 8.dp,
                                                    vertical = 4.dp,
                                                ),
                                                color = when (word.level) {
                                                    1 -> PracticeDanger
                                                    2 -> Color(0xFFD97706)
                                                    else -> PracticeSuccess
                                                },
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.SemiBold,
                                            )
                                        }
                                        Spacer(Modifier.width(4.dp))
                                        TextButton(onClick = { onRemoveError(word) }) {
                                            Text("移除", color = PracticeDanger, fontSize = 11.sp)
                                        }
                                    } else {
                                        Text("Lv.${word.level}", color = PracticeMuted, fontSize = 10.sp)
                                    }
                                }
                            }
                        }
                    }
                }
                HorizontalDivider()
                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .align(Alignment.End)
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                ) {
                    Text("关闭")
                }
            }
        }
    }
}
