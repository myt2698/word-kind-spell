package com.wordmind.app.ui

import android.speech.tts.TextToSpeech
import androidx.activity.compose.BackHandler
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
import androidx.compose.ui.platform.LocalContext
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
                                message = error.message ?: "学习状态更新失败"
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
                Box(contentAlignment = Alignment.Center) {
                    Text("W", color = Color.White, fontSize = 36.sp, fontWeight = FontWeight.Black)
                }
            }
            Spacer(Modifier.height(24.dp))
            Text("欢迎使用 WordMind", fontSize = 27.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            Text("原生 Android 单词学习客户端", color = Muted, fontSize = 14.sp)
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
    onLogout: () -> Unit,
) {
    var destination by rememberSaveable { mutableIntStateOf(0) }
    val destinations = remember(user.role) {
        Destination.entries.filter { it != Destination.Manage || user.role == "admin" }
    }
    val speak = rememberWordSpeaker()
    val phonicsSpeak = rememberWordSpeaker(Locale.UK)
    var wordEditorOpen by remember { mutableStateOf(false) }
    var editingWord by remember { mutableStateOf<Word?>(null) }
    var deletingWord by remember { mutableStateOf<Word?>(null) }
    var deleteBusy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Scaffold(
        containerColor = PageBackground,
        bottomBar = {
            NavigationBar(containerColor = Color.White) {
                destinations.forEachIndexed { index, item ->
                    NavigationBarItem(
                        selected = destination == index,
                        onClick = { destination = index },
                        icon = { Icon(item.icon, contentDescription = item.label) },
                        label = { Text(item.label) },
                    )
                }
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
                    )
                    Destination.Practice -> PracticeScreen(
                        api = api,
                        speak = speak,
                        onMessage = onMessage,
                        onLearningChanged = onRefresh,
                    )
                    Destination.Phonics -> PhonicsScreen(
                        tags = tags,
                        words = words,
                        speak = phonicsSpeak,
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
                        textbooks = textbooks,
                        words = words,
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
    canManage: Boolean,
    onAddWord: () -> Unit,
    onEditWord: (Word) -> Unit,
    onDeleteWord: (Word) -> Unit,
) {
    var query by rememberSaveable { mutableStateOf("") }
    var searchOpen by rememberSaveable { mutableStateOf(false) }
    var textbookId by rememberSaveable { mutableStateOf<Int?>(null) }
    var unitId by rememberSaveable { mutableStateOf<Int?>(null) }
    var sort by rememberSaveable { mutableStateOf(WordSort.Newest) }
    var detailTagId by rememberSaveable { mutableStateOf<Int?>(null) }

    val units = remember(textbooks, textbookId) {
        textbooks.firstOrNull { it.id == textbookId }?.groups.orEmpty()
    }
    val textbookOptions = remember(textbooks) {
        textbooks.map { it.id to it.name }
    }
    val unitOptions = remember(units) {
        units.map { it.id to it.name }
    }
    val filtered = remember(words, textbookId, unitId, sort) {
        val matches = words.filter { word ->
            (textbookId == null || word.textbookId == textbookId) &&
                (unitId == null || word.groupId == unitId)
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

    BackHandler(enabled = searchOpen) {
        searchOpen = false
        query = ""
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
                                },
                            )
                            WordFilterDropdown(
                                allLabel = "全部单元",
                                selectedId = unitId,
                                options = unitOptions,
                                modifier = Modifier.weight(1f),
                                enabled = textbookId != null,
                                onSelect = { unitId = it },
                            )
                        }
                    }
                }
            }
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    val learningCount = words.count { it.learningStatus != "idle" }
                    Text(
                        buildString {
                            append("共 ${filtered.size} 个单词")
                            if (learningCount > 0) append("  ·  学习中 $learningCount")
                        },
                        modifier = Modifier.weight(1f),
                        color = Muted,
                        fontSize = 13.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        if (hasFilters) {
                            TextButton(
                                onClick = {
                                    textbookId = null
                                    unitId = null
                                },
                                contentPadding = PaddingValues(horizontal = 7.dp, vertical = 0.dp),
                            ) {
                                Text("清除", fontSize = 12.sp)
                            }
                        }
                        WordSortDropdown(
                            selected = sort,
                            onSelect = { sort = it },
                        )
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color.White,
                            border = BorderStroke(1.dp, Border),
                        ) {
                            IconButton(
                                onClick = { searchOpen = true },
                                modifier = Modifier.size(38.dp),
                            ) {
                                Icon(
                                    Icons.Default.Search,
                                    contentDescription = "搜索单词",
                                    modifier = Modifier.size(19.dp),
                                    tint = Color(0xFF475569),
                                )
                            }
                        }
                        if (canManage) {
                            Button(
                                onClick = onAddWord,
                                modifier = Modifier.height(38.dp),
                                shape = RoundedCornerShape(10.dp),
                                contentPadding = PaddingValues(horizontal = 11.dp, vertical = 0.dp),
                            ) {
                                Icon(
                                    Icons.Default.Add,
                                    contentDescription = null,
                                    modifier = Modifier.size(17.dp),
                                )
                                Spacer(Modifier.width(4.dp))
                                Text("添加单词", fontSize = 12.sp)
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
) {
    var expanded by rememberSaveable(word.id) { mutableStateOf(false) }
    val isLearning = word.learningStatus != "idle"

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = CardDefaults.outlinedCardBorder(),
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
                        append(word.textbookName)
                        word.groupName?.let { append(" > ").append(it) }
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

            if (canManage) {
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
private fun ProfileScreen(
    api: WordMindApi,
    user: User,
    textbooks: List<Textbook>,
    words: List<Word>,
    onUserUpdated: (User) -> Unit,
    onRefresh: () -> Unit,
    onLogout: () -> Unit,
) {
    var editingNickname by remember { mutableStateOf(false) }
    var changingPassword by remember { mutableStateOf(false) }
    var clearingRecords by remember { mutableStateOf(false) }
    var notice by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Surface(
            modifier = Modifier.size(82.dp),
            shape = CircleShape,
            color = Color(0xFFEEF2FF),
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(
                    user.name.take(1).uppercase(),
                    color = Indigo,
                    fontSize = 34.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
        Spacer(Modifier.height(13.dp))
        Text(user.name, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text(if (user.role == "admin") "管理员账号" else "学习账号", color = Muted, fontSize = 13.sp)
        Spacer(Modifier.height(24.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            border = CardDefaults.outlinedCardBorder(),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 20.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                Stat("${words.size}", "全部单词")
                Stat("${textbooks.size}", "共享课本")
                Stat("${words.count { it.learningStatus != "idle" }}", "学习中")
            }
        }
        Spacer(Modifier.height(16.dp))

        notice?.let {
            MessageBanner(
                text = it,
                danger = false,
                onDismiss = { notice = null },
            )
            Spacer(Modifier.height(16.dp))
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            border = CardDefaults.outlinedCardBorder(),
        ) {
            Column {
                ProfileAction(
                    icon = Icons.Default.Edit,
                    title = "修改昵称",
                    subtitle = "当前昵称：${user.name}",
                    onClick = { editingNickname = true },
                )
                HorizontalDivider(color = Border)
                ProfileAction(
                    icon = Icons.Default.Key,
                    title = "修改密码",
                    subtitle = "使用原密码设置新密码",
                    onClick = { changingPassword = true },
                )
                HorizontalDivider(color = Border)
                ProfileAction(
                    icon = Icons.Default.Delete,
                    title = "清空学习记录",
                    subtitle = "清除当前账号的进度、错题与练习记录",
                    tint = Danger,
                    onClick = { clearingRecords = true },
                )
                HorizontalDivider(color = Border)
                ProfileAction(
                    icon = Icons.AutoMirrored.Filled.Logout,
                    title = "退出登录",
                    subtitle = "退出当前账号",
                    tint = Danger,
                    onClick = onLogout,
                )
            }
        }
    }

    if (editingNickname) {
        EditNicknameDialog(
            api = api,
            user = user,
            onUpdated = {
                editingNickname = false
                onUserUpdated(it)
                notice = "昵称修改成功"
            },
            onDismiss = { editingNickname = false },
        )
    }

    if (changingPassword) {
        ChangePasswordDialog(
            api = api,
            onChanged = {
                changingPassword = false
                notice = it
            },
            onDismiss = { changingPassword = false },
        )
    }

    if (clearingRecords) {
        ClearLearningRecordsDialog(
            api = api,
            onCleared = {
                clearingRecords = false
                notice = it
                onRefresh()
            },
            onDismiss = { clearingRecords = false },
        )
    }
}

@Composable
private fun ProfileAction(
    icon: ImageVector,
    title: String,
    subtitle: String,
    tint: Color = Indigo,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Surface(
            modifier = Modifier.size(38.dp),
            shape = RoundedCornerShape(11.dp),
            color = if (tint == Danger) Color(0xFFFEF2F2) else Color(0xFFEEF2FF),
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = tint,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = tint)
            Spacer(Modifier.height(2.dp))
            Text(subtitle, fontSize = 12.sp, color = Muted)
        }
        Icon(
            imageVector = Icons.Default.ChevronRight,
            contentDescription = null,
            tint = Muted,
            modifier = Modifier.size(18.dp),
        )
    }
}

@Composable
private fun Stat(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontSize = 23.sp, fontWeight = FontWeight.Bold, color = Indigo)
        Spacer(Modifier.height(3.dp))
        Text(label, color = Muted, fontSize = 12.sp)
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
private fun rememberWordSpeaker(locale: Locale = Locale.US): (String) -> Unit {
    val context = LocalContext.current
    var ready by remember { mutableStateOf(false) }
    val textToSpeech = remember {
        TextToSpeech(context) { status ->
            ready = status == TextToSpeech.SUCCESS
        }
    }

    LaunchedEffect(ready, locale) {
        if (ready) {
            textToSpeech.language = locale
            textToSpeech.setSpeechRate(0.88f)
        }
    }
    DisposableEffect(textToSpeech) {
        onDispose {
            textToSpeech.stop()
            textToSpeech.shutdown()
        }
    }

    return remember(textToSpeech, ready, locale) {
        { word ->
            if (ready) {
                textToSpeech.speak(word, TextToSpeech.QUEUE_FLUSH, null, "word-$word")
            }
        }
    }
}
