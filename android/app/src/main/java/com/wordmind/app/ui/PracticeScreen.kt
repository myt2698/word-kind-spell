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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CheckBox
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Extension
import androidx.compose.material.icons.filled.Headphones
import androidx.compose.material.icons.filled.Keyboard
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
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
import com.wordmind.app.data.SpellingStats
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
    Blocks,
    FillBlank,
    Flash,
    Dictation,
}

private enum class StatDialogType {
    Learning,
    New,
    Review,
    Errors,
}

@Composable
internal fun PracticeScreen(
    api: WordMindApi,
    catalogWords: List<Word>,
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

    fun openMode(mode: PracticeView) {
        if (selectedWords.isEmpty()) {
            selectionOpen = true
        } else {
            view = mode
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
    ) {
        scope.launch {
            try {
                api.submitSpellingResult(
                    wordId = word.id,
                    correct = correct,
                    userInput = input,
                    durationMs = durationMs,
                    practiceMode = mode,
                )
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
            onSelectWords = { selectionOpen = true },
            onMode = ::openMode,
            onStat = { statDialog = it },
        )
        PracticeView.Study -> TodayStudyMode(
            words = selectedWords,
            catalogWords = catalogWords,
            speak = speak,
            onBack = ::returnHome,
        )
        PracticeView.Blocks -> BlocksPracticeMode(
            words = selectedWords,
            speak = speak,
            onBack = ::returnHome,
            onSubmit = ::submitResult,
        )
        PracticeView.FillBlank -> FillBlankPracticeMode(
            words = selectedWords,
            speak = speak,
            onBack = ::returnHome,
            onSubmit = ::submitResult,
        )
        PracticeView.Flash -> FlashPracticeMode(
            words = selectedWords,
            speak = speak,
            onBack = ::returnHome,
            onSubmit = ::submitResult,
        )
        PracticeView.Dictation -> DictationPracticeMode(
            words = selectedWords,
            speak = speak,
            onBack = ::returnHome,
        )
    }

    if (selectionOpen) {
        PracticeWordSelectionDialog(
            words = learningWords,
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
    onSelectWords: () -> Unit,
    onMode: (PracticeView) -> Unit,
    onStat: (StatDialogType) -> Unit,
) {
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
        }
        Spacer(Modifier.height(3.dp))
        Text("先选择今日练习单词，再开始练习", color = PracticeMuted, fontSize = 13.sp)
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

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            PracticeStatCard(
                value = stats?.learningWords ?: learningWords.size,
                label = "学习中",
                color = PracticeSuccess,
                onClick = { onStat(StatDialogType.Learning) },
                modifier = Modifier.weight(1f),
            )
            PracticeStatCard(
                value = stats?.manualDue ?: reviewWords.count {
                    it.source == "manual" && it.totalAttempts == 0
                },
                label = "新学单词",
                color = PracticeIndigo,
                onClick = { onStat(StatDialogType.New) },
                modifier = Modifier.weight(1f),
            )
            PracticeStatCard(
                value = stats?.dueForReview ?: reviewWords.size,
                label = "总待复习",
                color = PracticeAmber,
                onClick = { onStat(StatDialogType.Review) },
                modifier = Modifier.weight(1f),
            )
            PracticeStatCard(
                value = stats?.totalErrors ?: errorWords.size,
                label = "错题",
                color = Color(0xFFE11D48),
                onClick = { onStat(StatDialogType.Errors) },
                modifier = Modifier.weight(1f),
            )
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

        Text("选择练习模式", color = Color(0xFF334155), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(10.dp))
        PracticeModeCard(
            title = "积木拼拼乐",
            description = if (selectedWords.isEmpty()) {
                "请先选择今日练习单词"
            } else {
                "点击字母积木拼出正确单词"
            },
            icon = Icons.Default.Extension,
            color = PracticeIndigo,
            background = Color(0xFFEEF2FF),
            enabled = selectedWords.isNotEmpty(),
            onClick = { onMode(PracticeView.Blocks) },
        )
        Spacer(Modifier.height(10.dp))
        PracticeModeCard(
            title = "单词消消乐",
            description = if (selectedWords.isEmpty()) {
                "请先选择今日练习单词"
            } else {
                "根据提示填写缺失的字母"
            },
            icon = Icons.Default.Keyboard,
            color = PracticeSuccess,
            background = Color(0xFFECFDF5),
            enabled = selectedWords.isNotEmpty(),
            onClick = { onMode(PracticeView.FillBlank) },
        )
        Spacer(Modifier.height(10.dp))
        PracticeModeCard(
            title = "极速闪电战",
            description = if (selectedWords.isEmpty()) {
                "请先选择今日练习单词"
            } else {
                "限时快速拼写挑战"
            },
            icon = Icons.Default.Bolt,
            color = PracticeAmber,
            background = Color(0xFFFFFBEB),
            enabled = selectedWords.isNotEmpty(),
            onClick = { onMode(PracticeView.Flash) },
        )
        Spacer(Modifier.height(10.dp))
        PracticeModeCard(
            title = "听写模式",
            description = if (selectedWords.isEmpty()) {
                "请先选择今日练习单词"
            } else {
                "每个单词读两遍，听音写词"
            },
            icon = Icons.Default.Headphones,
            color = PracticePurple,
            background = Color(0xFFFAF5FF),
            enabled = selectedWords.isNotEmpty(),
            onClick = { onMode(PracticeView.Dictation) },
        )
    }
}

@Composable
private fun PracticeStatCard(
    value: Int,
    label: String,
    color: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        onClick = onClick,
        modifier = modifier.height(76.dp),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = CardDefaults.outlinedCardBorder(),
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text("$value", color = color, fontSize = 19.sp, fontWeight = FontWeight.Bold)
            Text(
                label,
                color = PracticeMuted,
                fontSize = 10.sp,
                maxLines = 1,
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
    initialSelected: Set<Int>,
    saving: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (Set<Int>) -> Unit,
) {
    var selected by remember { mutableStateOf(initialSelected) }
    val allIds = remember(words) { words.mapTo(mutableSetOf()) { it.id } }
    val allSelected = words.isNotEmpty() && selected.containsAll(allIds)

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
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(
                        onClick = {
                            selected = if (allSelected) emptySet() else allIds
                        },
                    ) {
                        Text(if (allSelected) "取消全选" else "全选", fontSize = 12.sp)
                    }
                    Spacer(Modifier.weight(1f))
                    Text("${words.size} 个单词", color = PracticeMuted, fontSize = 11.sp)
                }
                HorizontalDivider()
                if (words.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("暂无学习中的单词", color = PracticeMuted, fontSize = 13.sp)
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(12.dp),
                        verticalArrangement = Arrangement.spacedBy(7.dp),
                    ) {
                        items(words, key = { it.id }) { word ->
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
