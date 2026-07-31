package com.wordmind.app.ui

import android.content.Context
import android.content.res.Configuration
import android.media.MediaPlayer
import android.speech.tts.TextToSpeech
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Image
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Label
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wordmind.app.R
import com.wordmind.app.data.Tag
import com.wordmind.app.data.Textbook
import com.wordmind.app.data.User
import com.wordmind.app.data.Word
import com.wordmind.app.data.WordMindApi
import kotlinx.coroutines.launch
import java.util.Locale

private val Indigo = Color(0xFF4F46E5)
private val Blue = Color(0xFF2563EB)
private val PageBackground = Color(0xFFF8FAFC)
private val Border = Color(0xFFE2E8F0)
private val Muted = Color(0xFF64748B)
private val Success = Color(0xFF059669)
private val Danger = Color(0xFFDC2626)
private const val WordFilterPreferences = "ciyindao_word_filters"
private const val TextbookFilterKey = "textbook_id"
private const val UnitFilterKey = "unit_id"
private const val WordSortKey = "sort"

private val WordMindColors = lightColorScheme(
    primary = Indigo,
    secondary = Blue,
    background = PageBackground,
    surface = Color.White,
    onBackground = Color(0xFF0F172A),
    onSurface = Color(0xFF0F172A),
    error = Danger,
)

private enum class Destination(val label: String, val icon: ImageVector) {
    Words("单词", Icons.Default.Book),
    Practice("拼写", Icons.Default.School),
    Phonics("拼读", Icons.Default.GraphicEq),
    Manage("管理", Icons.Default.Build),
    Profile("我的", Icons.Default.Person),
}

private enum class WordSort(val label: String) {
    Newest("最新"),
    Oldest("最早"),
    Alphabetical("字母"),
}

@Composable
private fun AppNavigationBar(
    destinations: List<Destination>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit,
) {
    val configuration = LocalConfiguration.current
    val isTabletLandscape =
        configuration.smallestScreenWidthDp >= 600 &&
            configuration.orientation == Configuration.ORIENTATION_LANDSCAPE

    if (!isTabletLandscape) {
        NavigationBar(containerColor = Color.White) {
            destinations.forEachIndexed { index, item ->
                NavigationBarItem(
                    selected = selectedIndex == index,
                    onClick = { onSelect(index) },
                    icon = { Icon(item.icon, contentDescription = item.label) },
                    label = { Text(item.label) },
                )
            }
        }
        return
    }

    NavigationBar(containerColor = Color.White, tonalElevation = 3.dp) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(72.dp)
                .padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(
                space = 18.dp,
                alignment = Alignment.CenterHorizontally,
            ),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            destinations.forEachIndexed { index, item ->
                val selected = selectedIndex == index
                Surface(
                    onClick = { onSelect(index) },
                    modifier = Modifier
                        .width(84.dp)
                        .height(56.dp),
                    shape = RoundedCornerShape(18.dp),
                    color = if (selected) Color(0xFFEDE9FE) else Color.Transparent,
                ) {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Icon(
                            item.icon,
                            contentDescription = item.label,
                            tint = if (selected) Indigo else Color(0xFF575260),
                            modifier = Modifier.size(23.dp),
                        )
                        Spacer(Modifier.height(2.dp))
                        Text(
                            item.label,
                            color = if (selected) Indigo else Color(0xFF575260),
                            fontSize = 11.sp,
                            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun WordMindApp(api: WordMindApi) {
    MaterialTheme(colorScheme = WordMindColors) {
        Surface(modifier = Modifier.fillMaxSize(), color = PageBackground) {
            var user by remember { mutableStateOf<User?>(null) }
            var textbooks by remember { mutableStateOf<List<Textbook>>(emptyList()) }
            var words by remember { mutableStateOf<List<Word>>(emptyList()) }
            var tags by remember { mutableStateOf<List<Tag>>(emptyList()) }
            var booting by remember { mutableStateOf(true) }
            var loadingCatalog by remember { mutableStateOf(false) }
            var message by remember { mutableStateOf<String?>(null) }
            val scope = rememberCoroutineScope()

            suspend fun refreshCatalog() {
                loadingCatalog = true
                try {
                    val result = api.loadCatalog()
                    textbooks = result.textbooks
                    words = result.words
                    tags = result.tags
                    message = null
                } catch (error: Exception) {
                    error.rethrowIfCancellation()
                    message = error.message ?: "数据加载失败"
                } finally {
                    loadingCatalog = false
                }
            }

            LaunchedEffect(Unit) {
                try {
                    user = api.restoreUser()
                    if (user != null) refreshCatalog()
                } catch (error: Exception) {
                    error.rethrowIfCancellation()
                    message = error.message ?: "无法连接服务器"
                } finally {
                    booting = false
                }
            }

            when {
                booting -> LoadingScreen("正在恢复登录状态…")
                user == null -> LoginScreen(
                    initialMessage = message,
                    onSubmit = { name, password, register, finished ->
                        scope.launch {
                            try {
                                val signedIn = if (register) {
                                    api.register(name, password)
                                } else {
                                    api.login(name, password)
                                }
                                user = signedIn
                                message = null
                                refreshCatalog()
                                finished(null)
                            } catch (error: Exception) {
                                error.rethrowIfCancellation()
                                finished(error.message ?: if (register) "注册失败" else "登录失败")
                            }
                        }
                    },
                )
                else -> MainScreen(
                    api = api,
                    user = user!!,
                    textbooks = textbooks,
                    words = words,
                    tags = tags,
                    loading = loadingCatalog,
                    message = message,
                    onMessage = { message = it },
                    onDismissMessage = { message = null },
                    onRefresh = { scope.launch { refreshCatalog() } },
                    onUserUpdated = { user = it },
                    onLearningChange = { word, active ->
                        scope.launch {
                            try {
                                api.setLearning(word.id, active)
                                words = words.map {
                                    if (it.id == word.id) {
                                        it.copy(learningStatus = if (active) "active" else "idle")
                                    } else {
                                        it
                                    }
                                }
                            } catch (error: Exception) {
                                error.rethrowIfCancellation()
                                message = error.message ?: "学习状态更新失败"
                            }
                        }
                    },
                    onBulkLearningChange = { wordIds, finished ->
                        scope.launch {
                            try {
                                api.addManyToLearning(wordIds)
                                val selectedIds = wordIds.toSet()
                                words = words.map { word ->
                                    if (word.id in selectedIds) {
                                        word.copy(learningStatus = "active")
                                    } else {
                                        word
                                    }
                                }
                                finished(null)
                            } catch (error: Exception) {
                                error.rethrowIfCancellation()
                                val errorMessage = error.message ?: "批量加入学习失败"
                                message = errorMessage
                                finished(errorMessage)
                            }
                        }
                    },
                    onLogout = {
                        scope.launch {
                            try {
                                api.logout()
                            } catch (_: Exception) {
                                // The local session is cleared by the API client even if the server is offline.
                            }
                            user = null
                            words = emptyList()
                            textbooks = emptyList()
                            tags = emptyList()
                            message = null
                        }
                    },
                )
            }
        }
    }
}

@Composable
private fun LoadingScreen(text: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator(color = Indigo, strokeWidth = 3.dp)
            Spacer(Modifier.height(16.dp))
            Text(text, color = Muted, fontSize = 14.sp)
        }
    }
}

@Composable
private fun LoginScreen(
    initialMessage: String?,
    onSubmit: (
        name: String,
        password: String,
        register: Boolean,
        finished: (String?) -> Unit,
    ) -> Unit,
) {
    var name by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var passwordVisible by rememberSaveable { mutableStateOf(false) }
    var registerMode by rememberSaveable { mutableStateOf(false) }
    var submitting by remember { mutableStateOf(false) }
    var error by remember(initialMessage) { mutableStateOf(initialMessage) }

    fun submit() {
        if (submitting) return
        if (name.isBlank() || password.isBlank()) {
            error = "请输入昵称和密码"
            return
        }
        if (registerMode && password.length < 6) {
            error = "密码至少需要 6 位"
            return
        }
        submitting = true
        error = null
        onSubmit(name, password, registerMode) {
            submitting = false
            error = it
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PageBackground)
            .imePadding(),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 28.dp, vertical = 40.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Surface(
                modifier = Modifier.size(76.dp),
                shape = RoundedCornerShape(24.dp),
                color = Indigo,
                shadowElevation = 12.dp,
            ) {
                Image(
                    // ic_launcher resolves to an adaptive-icon XML on modern
                    // Android, which painterResource cannot render directly.
                    painter = painterResource(R.mipmap.ic_launcher_foreground),
                    contentDescription = "词音岛",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )
            }
            Spacer(Modifier.height(24.dp))
            Text("欢迎来到词音岛", fontSize = 27.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            Text("课本同步 · 自然拼读 · 拼写练习", color = Muted, fontSize = 14.sp)
            Spacer(Modifier.height(34.dp))

            if (!error.isNullOrBlank()) {
                MessageBanner(error!!, danger = true, onDismiss = { error = null })
                Spacer(Modifier.height(14.dp))
            }

            OutlinedTextField(
                value = name,
                onValueChange = { name = it; error = null },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("昵称") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    capitalization = KeyboardCapitalization.None,
                    imeAction = ImeAction.Next,
                ),
                shape = RoundedCornerShape(14.dp),
            )
            Spacer(Modifier.height(14.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it; error = null },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("密码") },
                singleLine = true,
                visualTransformation = if (passwordVisible) {
                    VisualTransformation.None
                } else {
                    PasswordVisualTransformation()
                },
                trailingIcon = {
                    TextButton(onClick = { passwordVisible = !passwordVisible }) {
                        Text(if (passwordVisible) "隐藏" else "显示")
                    }
                },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { submit() }),
                shape = RoundedCornerShape(14.dp),
            )
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = { submit() },
                enabled = !submitting,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp),
                shape = RoundedCornerShape(14.dp),
            ) {
                if (submitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        color = Color.White,
                        strokeWidth = 2.dp,
                    )
                } else {
                    Text(if (registerMode) "注册并登录" else "登录", fontSize = 17.sp)
                }
            }
            Spacer(Modifier.height(10.dp))
            TextButton(
                enabled = !submitting,
                onClick = {
                    registerMode = !registerMode
                    error = null
                },
            ) {
                Text(if (registerMode) "已有账号？返回登录" else "还没有账号？立即注册")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MainScreen(
    api: WordMindApi,
    user: User,
    textbooks: List<Textbook>,
    words: List<Word>,
    tags: List<Tag>,
    loading: Boolean,
    message: String?,
    onMessage: (String) -> Unit,
    onDismissMessage: () -> Unit,
    onRefresh: () -> Unit,
    onUserUpdated: (User) -> Unit,
    onLearningChange: (Word, Boolean) -> Unit,
    onBulkLearningChange: (List<Int>, (String?) -> Unit) -> Unit,
    onLogout: () -> Unit,
) {
    var destination by rememberSaveable { mutableIntStateOf(0) }
    val destinations = remember(user.role) {
        Destination.entries.filter { it != Destination.Manage || user.role == "admin" }
    }
    val speak = rememberWordSpeaker(api)
    val phonicsSpeak = rememberWordSpeaker(api, Locale.UK)
    var wordEditorOpen by remember { mutableStateOf(false) }
    var editingWord by remember { mutableStateOf<Word?>(null) }
    var deletingWord by remember { mutableStateOf<Word?>(null) }
    var deleteBusy by remember { mutableStateOf(false) }
    var secondaryPageOpen by rememberSaveable { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Scaffold(
        containerColor = PageBackground,
        bottomBar = {
            if (!secondaryPageOpen) {
                AppNavigationBar(
                    destinations = destinations,
                    selectedIndex = destination,
                    onSelect = {
                        destination = it
                        secondaryPageOpen = false
                    },
                )
            }
        },
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = loading,
            onRefresh = onRefresh,
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                if (!message.isNullOrBlank()) {
                    MessageBanner(
                        text = message,
                        danger = true,
                        onDismiss = onDismissMessage,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    )
                }
                when (destinations[destination]) {
                    Destination.Words -> WordsScreen(
                        words = words,
                        textbooks = textbooks,
                        tags = tags,
                        speak = speak,
                        onLearningChange = onLearningChange,
                        onBulkLearningChange = onBulkLearningChange,
                        canManage = user.role == "admin",
                        onAddWord = {
                            editingWord = null
                            wordEditorOpen = true
                        },
                        onEditWord = {
                            editingWord = it
                            wordEditorOpen = true
                        },
                        onDeleteWord = { deletingWord = it },
                        onSecondaryPageChanged = { secondaryPageOpen = it },
                    )
                    Destination.Practice -> PracticeScreen(
                        api = api,
                        catalogWords = words,
                        textbooks = textbooks,
                        speak = speak,
                        onMessage = onMessage,
                        onLearningChanged = onRefresh,
                        onSecondaryPageChanged = { secondaryPageOpen = it },
                    )
                    Destination.Phonics -> PhonicsScreen(
                        tags = tags,
                        words = words,
                        speak = phonicsSpeak,
                        canManage = user.role == "admin",
                        onEditWord = {
                            editingWord = it
                            wordEditorOpen = true
                        },
                        onSecondaryPageChanged = { secondaryPageOpen = it },
                    )
                    Destination.Manage -> AdminScreen(
                        api = api,
                        textbooks = textbooks,
                        tags = tags,
                        onChanged = onRefresh,
                        onMessage = onMessage,
                    )
                    Destination.Profile -> ProfileScreen(
                        api = api,
                        user = user,
                        onOpenAdmin = {
                            destinations.indexOf(Destination.Manage)
                                .takeIf { it >= 0 }
                                ?.let {
                                    destination = it
                                    secondaryPageOpen = false
                                }
                        },
                        onUserUpdated = onUserUpdated,
                        onRefresh = onRefresh,
                        onLogout = onLogout,
                    )
                }
            }
        }
    }

    if (wordEditorOpen) {
        WordEditorDialog(
            api = api,
            existing = editingWord,
            textbooks = textbooks,
            tags = tags,
            onSaved = {
                wordEditorOpen = false
                onRefresh()
            },
            onDismiss = { wordEditorOpen = false },
            onMessage = onMessage,
        )
    }

    deletingWord?.let { word ->
        ConfirmDeleteDialog(
            title = "删除单词",
            text = "确定删除“${word.word}”吗？所有账号都会失去这个共享单词。",
            busy = deleteBusy,
            onDismiss = { deletingWord = null },
            onConfirm = {
                if (!deleteBusy) {
                    deleteBusy = true
                    scope.launch {
                        try {
                            api.deleteWord(word.id)
                            deletingWord = null
                            onRefresh()
                        } catch (error: Exception) {
                            error.rethrowIfCancellation()
                            onMessage(error.message ?: "删除单词失败")
                        } finally {
                            deleteBusy = false
                        }
                    }
                }
            },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WordsScreen(
    words: List<Word>,
    textbooks: List<Textbook>,
    tags: List<Tag>,
    speak: (String) -> Unit,
    onLearningChange: (Word, Boolean) -> Unit,
    onBulkLearningChange: (List<Int>, (String?) -> Unit) -> Unit,
    canManage: Boolean,
    onAddWord: () -> Unit,
    onEditWord: (Word) -> Unit,
    onDeleteWord: (Word) -> Unit,
    onSecondaryPageChanged: (Boolean) -> Unit,
) {
    val context = LocalContext.current
    val filterPreferences = remember(context) {
        context.getSharedPreferences(WordFilterPreferences, Context.MODE_PRIVATE)
    }
    var query by rememberSaveable { mutableStateOf("") }
    var searchOpen by rememberSaveable { mutableStateOf(false) }
    var textbookId by rememberSaveable {
        mutableStateOf(
            filterPreferences.getInt(TextbookFilterKey, -1).takeIf { it > 0 },
        )
    }
    var unitId by rememberSaveable {
        mutableStateOf(
            filterPreferences.getInt(UnitFilterKey, -1).takeIf { it > 0 },
        )
    }
    var sort by rememberSaveable {
        mutableStateOf(
            runCatching {
                WordSort.valueOf(
                    filterPreferences.getString(WordSortKey, null)
                        ?: WordSort.Newest.name,
                )
            }.getOrDefault(WordSort.Newest),
        )
    }
    var detailTagId by rememberSaveable { mutableStateOf<Int?>(null) }
    var selectionMode by remember { mutableStateOf(false) }
    var selectedWordIds by remember { mutableStateOf<Set<Int>>(emptySet()) }
    var bulkAdding by remember { mutableStateOf(false) }

    fun leaveSelectionMode() {
        selectionMode = false
        selectedWordIds = emptySet()
    }

    LaunchedEffect(searchOpen) {
        onSecondaryPageChanged(searchOpen)
    }

    val units = remember(textbooks, textbookId) {
        textbooks.firstOrNull { it.id == textbookId }?.groups.orEmpty()
    }
    val textbookOptions = remember(textbooks) {
        textbooks.map { it.id to it.name }
    }
    val unitOptions = remember(units) {
        units.map { it.id to it.name }
    }
    LaunchedEffect(textbookId, unitId, sort) {
        filterPreferences.edit()
            .putInt(TextbookFilterKey, textbookId ?: -1)
            .putInt(UnitFilterKey, unitId ?: -1)
            .putString(WordSortKey, sort.name)
            .apply()
    }
    LaunchedEffect(textbooks, textbookId) {
        if (
            textbooks.isNotEmpty() &&
            textbookId != null &&
            textbooks.none { it.id == textbookId }
        ) {
            textbookId = null
            unitId = null
        }
    }
    LaunchedEffect(units, unitId) {
        if (
            textbooks.isNotEmpty() &&
            textbookId != null &&
            unitId != null &&
            units.none { it.id == unitId }
        ) {
            unitId = null
        }
    }
    val filtered = remember(words, textbookId, unitId, sort) {
        val matches = words.filter { word ->
            val matchesTextbook = textbookId == null ||
                word.textbookId == textbookId ||
                word.groups.any { it.textbookId == textbookId }
            val matchesUnit = unitId == null ||
                word.groupId == unitId ||
                word.groups.any { it.groupId == unitId }
            matchesTextbook && matchesUnit
        }
        when (sort) {
            WordSort.Newest -> matches
            WordSort.Oldest -> matches.asReversed()
            WordSort.Alphabetical -> matches.sortedWith(
                compareBy(String.CASE_INSENSITIVE_ORDER) { it.word }
            )
        }
    }
    val searchResults = remember(words, query, sort) {
        val needle = query.trim().lowercase()
        val matches = words.filter { word ->
            needle.isBlank() ||
                word.word.lowercase().contains(needle) ||
                word.definition.lowercase().contains(needle) ||
                word.notes.orEmpty().lowercase().contains(needle)
        }
        when (sort) {
            WordSort.Newest -> matches
            WordSort.Oldest -> matches.asReversed()
            WordSort.Alphabetical -> matches.sortedWith(
                compareBy(String.CASE_INSENSITIVE_ORDER) { it.word }
            )
        }
    }
    val hasFilters = textbookId != null || unitId != null
    val selectableWordIds = remember(filtered) {
        filtered
            .filter { it.learningStatus == "idle" }
            .map { it.id }
            .toSet()
    }
    val allSelectableSelected =
        selectableWordIds.isNotEmpty() && selectableWordIds.all { it in selectedWordIds }

    BackHandler(enabled = searchOpen) {
        searchOpen = false
        query = ""
    }
    BackHandler(enabled = selectionMode && !searchOpen) {
        leaveSelectionMode()
    }

    if (searchOpen) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 10.dp, bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color.White,
                        border = BorderStroke(1.dp, Border),
                    ) {
                        IconButton(
                            onClick = {
                                searchOpen = false
                                query = ""
                            },
                            modifier = Modifier.size(44.dp),
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "返回单词首页",
                                modifier = Modifier.size(21.dp),
                            )
                        }
                    }
                    CompactWordSearchField(
                        value = query,
                        onValueChange = { query = it },
                        onClear = { query = "" },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        if (query.isBlank()) {
                            "共 ${searchResults.size} 个单词"
                        } else {
                            "找到 ${searchResults.size} 个单词"
                        },
                        color = Muted,
                        fontSize = 13.sp,
                    )
                    WordSortDropdown(
                        selected = sort,
                        onSelect = { sort = it },
                    )
                }
            }
            if (searchResults.isEmpty()) {
                item {
                    EmptyContent("没有找到匹配的单词")
                }
            } else {
                items(searchResults, key = { it.id }) { word ->
                    WordCard(
                        word = word,
                        speak = speak,
                        onLearningChange = onLearningChange,
                        canManage = canManage,
                        onEdit = { onEditWord(word) },
                        onDelete = { onDeleteWord(word) },
                        onTagClick = { detailTagId = it.id },
                    )
                }
            }
        }
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 10.dp, bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = Color.White,
                    border = BorderStroke(1.dp, Border),
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(10.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            WordFilterDropdown(
                                allLabel = "全部课本",
                                selectedId = textbookId,
                                options = textbookOptions,
                                modifier = Modifier.weight(1f),
                                onSelect = { selectedId ->
                                    textbookId = selectedId
                                    unitId = null
                                    leaveSelectionMode()
                                },
                            )
                            WordFilterDropdown(
                                allLabel = "全部单元",
                                selectedId = unitId,
                                options = unitOptions,
                                modifier = Modifier.weight(1f),
                                enabled = textbookId != null,
                                onSelect = {
                                    unitId = it
                                    leaveSelectionMode()
                                },
                            )
                        }
                    }
                }
            }
            item {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Text(
                            "共 ${filtered.size} 个单词",
                            modifier = Modifier.weight(1f),
                            color = Muted,
                            fontSize = 13.sp,
                            maxLines = 1,
                        )
                        if (hasFilters) {
                            TextButton(
                                onClick = {
                                    textbookId = null
                                    unitId = null
                                    leaveSelectionMode()
                                },
                                contentPadding = PaddingValues(horizontal = 7.dp, vertical = 0.dp),
                            ) {
                                Text("清除筛选", fontSize = 12.sp)
                            }
                        }
                        if (selectionMode) {
                            TextButton(
                                onClick = { leaveSelectionMode() },
                                contentPadding = PaddingValues(horizontal = 9.dp, vertical = 0.dp),
                            ) {
                                Text("完成", fontSize = 12.sp)
                            }
                        } else {
                            WordSortDropdown(
                                selected = sort,
                                onSelect = { sort = it },
                            )
                        }
                    }
                    if (!selectionMode) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Surface(
                                onClick = {
                                    leaveSelectionMode()
                                    searchOpen = true
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(38.dp),
                                shape = RoundedCornerShape(10.dp),
                                color = Color.White,
                                border = BorderStroke(1.dp, Border),
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .padding(horizontal = 12.dp),
                                    horizontalArrangement = Arrangement.Center,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Icon(
                                        Icons.Default.Search,
                                        contentDescription = "搜索单词",
                                        modifier = Modifier.size(18.dp),
                                        tint = Color(0xFF475569),
                                    )
                                    Spacer(Modifier.width(6.dp))
                                    Text(
                                        "搜索单词",
                                        color = Color(0xFF475569),
                                        fontSize = 12.sp,
                                    )
                                }
                            }
                            OutlinedButton(
                                onClick = { selectionMode = true },
                                modifier = Modifier.height(38.dp),
                                shape = RoundedCornerShape(10.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
                            ) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                )
                                Spacer(Modifier.width(4.dp))
                                Text("选择", fontSize = 12.sp)
                            }
                            if (canManage) {
                                Surface(
                                    onClick = onAddWord,
                                    modifier = Modifier.size(38.dp),
                                    shape = RoundedCornerShape(10.dp),
                                    color = Indigo,
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            Icons.Default.Add,
                                            contentDescription = "添加单词",
                                            modifier = Modifier.size(18.dp),
                                            tint = Color.White,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if (selectionMode) {
                item {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFEEF2FF),
                        border = BorderStroke(1.dp, Color(0xFFC7D2FE)),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 9.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text(
                                "已选 ${selectedWordIds.size} 个",
                                modifier = Modifier.weight(1f),
                                color = Indigo,
                                fontSize = 12.sp,
                            )
                            OutlinedButton(
                                onClick = {
                                    selectedWordIds = if (allSelectableSelected) {
                                        emptySet()
                                    } else {
                                        selectableWordIds
                                    }
                                },
                                enabled = selectableWordIds.isNotEmpty() && !bulkAdding,
                                modifier = Modifier.height(34.dp),
                                shape = RoundedCornerShape(9.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
                            ) {
                                Text(
                                    if (allSelectableSelected) "取消全选" else "全选",
                                    fontSize = 12.sp,
                                )
                            }
                            Button(
                                onClick = {
                                    if (selectedWordIds.isNotEmpty() && !bulkAdding) {
                                        bulkAdding = true
                                        onBulkLearningChange(selectedWordIds.toList()) { error ->
                                            bulkAdding = false
                                            if (error == null) leaveSelectionMode()
                                        }
                                    }
                                },
                                enabled = selectedWordIds.isNotEmpty() && !bulkAdding,
                                modifier = Modifier.height(34.dp),
                                shape = RoundedCornerShape(9.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
                            ) {
                                if (bulkAdding) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(14.dp),
                                        color = Color.White,
                                        strokeWidth = 2.dp,
                                    )
                                } else {
                                    Text(
                                        "加入学习${if (selectedWordIds.isNotEmpty()) " (${selectedWordIds.size})" else ""}",
                                        fontSize = 12.sp,
                                    )
                                }
                            }
                        }
                    }
                }
            }
            if (filtered.isEmpty()) {
                item {
                    EmptyContent(if (words.isEmpty()) "暂无单词数据" else "没有找到匹配的单词")
                }
            } else {
                items(filtered, key = { it.id }) { word ->
                    WordCard(
                        word = word,
                        speak = speak,
                        onLearningChange = onLearningChange,
                        canManage = canManage,
                        onEdit = { onEditWord(word) },
                        onDelete = { onDeleteWord(word) },
                        onTagClick = { detailTagId = it.id },
                        preferredGroupId = unitId,
                        preferredTextbookId = textbookId,
                        selectionMode = selectionMode,
                        selected = word.id in selectedWordIds,
                        selectionEnabled = word.id in selectableWordIds,
                        onSelectionChange = { selected ->
                            selectedWordIds = if (selected) {
                                selectedWordIds + word.id
                            } else {
                                selectedWordIds - word.id
                            }
                        },
                    )
                }
            }
        }
    }

    val detailTag = detailTagId?.let { selectedId ->
        tags.firstOrNull { it.id == selectedId }
            ?: words.asSequence().flatMap { it.tags.asSequence() }
                .firstOrNull { it.id == selectedId }
    }
    detailTag?.let { tag ->
        NativeTagDetailDialog(
            tag = tag,
            words = words.filter { word -> word.tags.any { it.id == tag.id } },
            speak = speak,
            onDismiss = { detailTagId = null },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WordSortDropdown(
    selected: WordSort,
    onSelect: (WordSort) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }

    ExposedDropdownMenuBox(
        modifier = Modifier.width(94.dp),
        expanded = expanded,
        onExpandedChange = { expanded = !expanded },
    ) {
        Surface(
            modifier = Modifier
                .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                .fillMaxWidth()
                .height(38.dp),
            shape = RoundedCornerShape(10.dp),
            color = Color.White,
            border = BorderStroke(1.dp, Border),
        ) {
            Row(
                modifier = Modifier.padding(start = 12.dp, end = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    selected.label,
                    modifier = Modifier.weight(1f),
                    color = Color(0xFF475569),
                    fontSize = 12.sp,
                )
                ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
            }
        }
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            WordSort.entries.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option.label) },
                    onClick = {
                        onSelect(option)
                        expanded = false
                    },
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WordFilterDropdown(
    allLabel: String,
    selectedId: Int?,
    options: List<Pair<Int, String>>,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onSelect: (Int?) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedLabel = if (enabled) {
        options.firstOrNull { it.first == selectedId }?.second ?: allLabel
    } else {
        allLabel
    }

    ExposedDropdownMenuBox(
        modifier = modifier,
        expanded = expanded,
        onExpandedChange = {
            if (enabled) {
                expanded = !expanded
            }
        },
    ) {
        Surface(
            modifier = Modifier
                .menuAnchor(MenuAnchorType.PrimaryNotEditable, enabled = enabled)
                .fillMaxWidth()
                .height(42.dp),
            shape = RoundedCornerShape(10.dp),
            color = if (enabled) Color(0xFFF8FAFC) else Color(0xFFF1F5F9),
            border = BorderStroke(1.dp, Border),
        ) {
            Row(
                modifier = Modifier.padding(start = 9.dp, end = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    selectedLabel,
                    modifier = Modifier.weight(1f),
                    color = if (enabled) Color(0xFF334155) else Color(0xFF94A3B8),
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
            }
        }
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            DropdownMenuItem(
                text = { Text(allLabel) },
                onClick = {
                    onSelect(null)
                    expanded = false
                },
            )
            options.forEach { option ->
                DropdownMenuItem(
                    text = {
                        Text(
                            option.second,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    },
                    onClick = {
                        onSelect(option.first)
                        expanded = false
                    },
                )
            }
        }
    }
}

@Composable
private fun CompactWordSearchField(
    value: String,
    onValueChange: (String) -> Unit,
    onClear: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier
            .height(44.dp),
        shape = RoundedCornerShape(10.dp),
        color = Color.White,
        border = BorderStroke(1.dp, Border),
    ) {
        Row(
            modifier = Modifier.padding(start = 10.dp, end = 3.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Default.Search,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
                tint = Color(0xFF94A3B8),
            )
            Spacer(Modifier.width(7.dp))
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                modifier = Modifier.weight(1f),
                singleLine = true,
                textStyle = MaterialTheme.typography.bodyMedium.copy(
                    color = Color(0xFF0F172A),
                    fontSize = 13.sp,
                ),
                cursorBrush = SolidColor(Indigo),
                decorationBox = { innerTextField ->
                    Box(contentAlignment = Alignment.CenterStart) {
                        if (value.isBlank()) {
                            Text(
                                "搜索单词、释义或备注",
                                color = Color(0xFF94A3B8),
                                fontSize = 13.sp,
                            )
                        }
                        innerTextField()
                    }
                },
            )
            if (value.isNotBlank()) {
                IconButton(
                    onClick = onClear,
                    modifier = Modifier.size(36.dp),
                ) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "清除搜索",
                        modifier = Modifier.size(17.dp),
                        tint = Muted,
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun WordCard(
    word: Word,
    speak: (String) -> Unit,
    onLearningChange: (Word, Boolean) -> Unit,
    canManage: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onTagClick: (Tag) -> Unit,
    preferredGroupId: Int? = null,
    preferredTextbookId: Int? = null,
    selectionMode: Boolean = false,
    selected: Boolean = false,
    selectionEnabled: Boolean = true,
    onSelectionChange: (Boolean) -> Unit = {},
) {
    var expanded by rememberSaveable(word.id) { mutableStateOf(false) }
    val isLearning = word.learningStatus != "idle"
    val preferredMembership = remember(
        word.groups,
        preferredGroupId,
        preferredTextbookId,
    ) {
        word.groups.firstOrNull { membership ->
            preferredGroupId != null && membership.groupId == preferredGroupId
        } ?: word.groups.firstOrNull { membership ->
            preferredGroupId == null &&
                preferredTextbookId != null &&
                membership.textbookId == preferredTextbookId
        }
    }
    val displayTextbookName = preferredMembership?.textbookName ?: word.textbookName
    val displayGroupName = preferredMembership?.groupName ?: word.groupName

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = if (selected) {
            BorderStroke(2.dp, Indigo)
        } else {
            CardDefaults.outlinedCardBorder()
        },
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            word.word,
                            fontSize = 21.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF111827),
                        )
                        Spacer(Modifier.width(4.dp))
                        IconButton(onClick = { speak(word.word) }, modifier = Modifier.size(38.dp)) {
                            Icon(
                                Icons.AutoMirrored.Filled.VolumeUp,
                                contentDescription = "朗读 ${word.word}",
                                tint = Indigo,
                                modifier = Modifier.size(21.dp),
                            )
                        }
                    }
                    if (!word.phonetic.isNullOrBlank()) {
                        Text(word.phonetic, color = Muted, fontSize = 13.sp)
                    }
                }
                if (selectionMode) {
                    if (selectionEnabled) {
                        Surface(
                            onClick = { onSelectionChange(!selected) },
                            modifier = Modifier.size(38.dp),
                            shape = RoundedCornerShape(10.dp),
                            color = if (selected) Indigo else Color.White,
                            border = BorderStroke(
                                1.dp,
                                if (selected) Indigo else Border,
                            ),
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = if (selected) {
                                        "取消选择 ${word.word}"
                                    } else {
                                        "选择 ${word.word}"
                                    },
                                    modifier = Modifier.size(20.dp),
                                    tint = if (selected) Color.White else Color(0xFF94A3B8),
                                )
                            }
                        }
                    } else {
                        Surface(
                            shape = RoundedCornerShape(9.dp),
                            color = Color(0xFFECFDF5),
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 9.dp, vertical = 7.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    modifier = Modifier.size(15.dp),
                                    tint = Success,
                                )
                                Spacer(Modifier.width(4.dp))
                                Text("已在学习中", color = Success, fontSize = 11.sp)
                            }
                        }
                    }
                } else {
                    OutlinedButton(
                        onClick = { onLearningChange(word, !isLearning) },
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
                    ) {
                        if (isLearning) {
                            Icon(
                                Icons.Default.CheckCircle,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = Success,
                            )
                            Spacer(Modifier.width(4.dp))
                        }
                        Text(if (isLearning) "学习中" else "加入学习", fontSize = 12.sp)
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
            Text(word.definition, fontSize = 15.sp, lineHeight = 22.sp)
            Spacer(Modifier.height(10.dp))
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                WordMetadataBadge(
                    icon = Icons.Default.Folder,
                    text = buildString {
                        append(displayTextbookName)
                        displayGroupName?.let { append(" > ").append(it) }
                    },
                )
                word.tags.forEach { tag ->
                    Surface(
                        modifier = Modifier.clickable { onTagClick(tag) },
                        shape = RoundedCornerShape(6.dp),
                        color = Color(0xFFEEF2FF),
                        border = BorderStroke(1.dp, Color(0xFFC7D2FE)),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.Label,
                                contentDescription = null,
                                modifier = Modifier.size(12.dp),
                                tint = Color(0xFF4F46E5),
                            )
                            Spacer(Modifier.width(4.dp))
                            Text(
                                tag.name,
                                color = Color(0xFF4F46E5),
                                fontSize = 11.sp,
                                maxLines = 1,
                            )
                        }
                    }
                }
            }

            if (canManage && !selectionMode) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                ) {
                    TextButton(onClick = onEdit) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = null,
                            modifier = Modifier.size(17.dp),
                        )
                        Spacer(Modifier.width(4.dp))
                        Text("编辑", fontSize = 12.sp)
                    }
                    TextButton(onClick = onDelete) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = null,
                            modifier = Modifier.size(17.dp),
                            tint = Danger,
                        )
                        Spacer(Modifier.width(4.dp))
                        Text("删除", color = Danger, fontSize = 12.sp)
                    }
                }
            }

            if (!word.example.isNullOrBlank() || !word.notes.isNullOrBlank()) {
                Spacer(Modifier.height(4.dp))
                TextButton(
                    onClick = { expanded = !expanded },
                    contentPadding = PaddingValues(horizontal = 0.dp, vertical = 2.dp),
                ) {
                    Icon(
                        if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = null,
                        modifier = Modifier.size(19.dp),
                    )
                    Text(if (expanded) "收起详情" else "查看例句和备注", fontSize = 12.sp)
                }
            }

            if (expanded) {
                HorizontalDivider(color = Border)
                word.example?.let {
                    Spacer(Modifier.height(10.dp))
                    Text("例句", color = Muted, fontSize = 11.sp)
                    Spacer(Modifier.height(3.dp))
                    Text(
                        highlightWordInExample(example = it, word = word.word),
                        color = Color(0xFF334155),
                        fontSize = 14.sp,
                        lineHeight = 20.sp,
                    )
                }
                word.notes?.let {
                    Spacer(Modifier.height(10.dp))
                    Text("备注", color = Muted, fontSize = 11.sp)
                    Spacer(Modifier.height(3.dp))
                    Surface(
                        shape = RoundedCornerShape(9.dp),
                        color = Color(0xFFFFFBEB),
                    ) {
                        Text(
                            it,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(10.dp),
                            color = Color(0xFF92400E),
                            fontSize = 13.sp,
                        )
                    }
                }
            }
        }
    }
}

private fun highlightWordInExample(
    example: String,
    word: String,
): AnnotatedString {
    val target = word.trim()
    if (target.isEmpty()) return AnnotatedString(example)

    val wordPattern = Regex(
        pattern = "(?<![\\p{L}\\p{N}])${Regex.escape(target)}(?![\\p{L}\\p{N}])",
        option = RegexOption.IGNORE_CASE,
    )
    val matches = wordPattern.findAll(example).toList()
    if (matches.isEmpty()) return AnnotatedString(example)

    return buildAnnotatedString {
        var cursor = 0
        matches.forEach { match ->
            append(example.substring(cursor, match.range.first))
            withStyle(
                SpanStyle(
                    color = Color(0xFF166534),
                    fontWeight = FontWeight.SemiBold,
                )
            ) {
                append(match.value)
            }
            cursor = match.range.last + 1
        }
        append(example.substring(cursor))
    }
}

@Composable
private fun WordMetadataBadge(
    icon: ImageVector,
    text: String,
) {
    Surface(
        shape = RoundedCornerShape(6.dp),
        color = Color(0xFFF8FAFC),
        border = BorderStroke(1.dp, Border),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                icon,
                contentDescription = null,
                modifier = Modifier.size(12.dp),
                tint = Muted,
            )
            Spacer(Modifier.width(4.dp))
            Text(
                text,
                color = Muted,
                fontSize = 11.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun TextbooksScreen(textbooks: List<Textbook>, words: List<Word>) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text("共享课本", fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(4.dp))
            Text("管理员修改后，所有账号会自动读取最新数据", color = Muted, fontSize = 13.sp)
        }
        if (textbooks.isEmpty()) {
            item { EmptyContent("暂无课本数据") }
        } else {
            items(textbooks, key = { it.id }) { textbook ->
                TextbookCard(
                    textbook = textbook,
                    fallbackWordCount = words.count { it.textbookId == textbook.id },
                )
            }
        }
    }
}

@Composable
private fun TextbookCard(textbook: Textbook, fallbackWordCount: Int) {
    var expanded by rememberSaveable(textbook.id) { mutableStateOf(false) }
    val totalWords = textbook.groups.sumOf { it.wordCount }.takeIf { it > 0 } ?: fallbackWordCount

    Card(
        onClick = { expanded = !expanded },
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = CardDefaults.outlinedCardBorder(),
    ) {
        Column(Modifier.padding(17.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    modifier = Modifier.size(46.dp),
                    shape = RoundedCornerShape(13.dp),
                    color = Color(0xFFEEF2FF),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            Icons.AutoMirrored.Filled.MenuBook,
                            contentDescription = null,
                            tint = Indigo,
                        )
                    }
                }
                Spacer(Modifier.width(13.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(textbook.name, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
                    Text(
                        "${textbook.groupCount} 个单元  ·  $totalWords 个单词",
                        color = Muted,
                        fontSize = 12.sp,
                    )
                }
                Icon(
                    if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = null,
                    tint = Muted,
                )
            }
            textbook.description?.takeIf { it.isNotBlank() }?.let {
                Spacer(Modifier.height(10.dp))
                Text(it, color = Muted, fontSize = 13.sp)
            }
            if (expanded && textbook.groups.isNotEmpty()) {
                Spacer(Modifier.height(13.dp))
                HorizontalDivider(color = Border)
                textbook.groups.forEachIndexed { index, group ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(group.name, fontSize = 14.sp)
                        Text("${group.wordCount} 词", color = Muted, fontSize = 13.sp)
                    }
                    if (index != textbook.groups.lastIndex) HorizontalDivider(color = Border)
                }
            }
        }
    }
}

@Composable
private fun EmptyContent(text: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 56.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, color = Muted)
    }
}

@Composable
private fun MessageBanner(
    text: String,
    danger: Boolean,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = if (danger) Color(0xFFFEF2F2) else Color(0xFFECFDF5),
        border = CardDefaults.outlinedCardBorder(),
    ) {
        Row(
            modifier = Modifier.padding(start = 13.dp, top = 9.dp, bottom = 9.dp, end = 5.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text,
                modifier = Modifier.weight(1f),
                color = if (danger) Danger else Success,
                fontSize = 13.sp,
            )
            TextButton(onClick = onDismiss) { Text("关闭", fontSize = 12.sp) }
        }
    }
}

@Composable
private fun rememberWordSpeaker(
    api: WordMindApi,
    locale: Locale = Locale.US,
): (String) -> Unit {
    val context = LocalContext.current
    var ready by remember { mutableStateOf(false) }
    val textToSpeech = remember {
        TextToSpeech(context) { status ->
            ready = status == TextToSpeech.SUCCESS
        }
    }
    val activePlayer = remember { arrayOfNulls<MediaPlayer>(1) }

    LaunchedEffect(ready, locale) {
        if (ready) {
            textToSpeech.language = locale
            textToSpeech.setSpeechRate(0.88f)
        }
    }
    DisposableEffect(textToSpeech) {
        onDispose {
            activePlayer[0]?.release()
            activePlayer[0] = null
            textToSpeech.stop()
            textToSpeech.shutdown()
        }
    }

    return remember(textToSpeech, ready, locale, api) {
        { word ->
            val fallback = {
                if (ready) {
                    textToSpeech.speak(word, TextToSpeech.QUEUE_FLUSH, null, "word-$word")
                }
            }
            try {
                activePlayer[0]?.release()
                activePlayer[0] = MediaPlayer().apply {
                    setDataSource(
                        api.speechUrl(
                            word,
                            if (locale == Locale.UK) "en-GB" else "en-US",
                        ),
                    )
                    setOnPreparedListener { it.start() }
                    setOnCompletionListener {
                        it.release()
                        if (activePlayer[0] === it) activePlayer[0] = null
                    }
                    setOnErrorListener { player, _, _ ->
                        player.release()
                        if (activePlayer[0] === player) activePlayer[0] = null
                        fallback()
                        true
                    }
                    prepareAsync()
                }
            } catch (_: Exception) {
                fallback()
            }
        }
    }
}
