package com.wordmind.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.PauseCircle
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wordmind.app.data.SpellingErrorEntry
import com.wordmind.app.data.SpellingStats
import com.wordmind.app.data.User
import com.wordmind.app.data.WordMindApi
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

private val ProfileIndigo = Color(0xFF4F46E5)
private val ProfileMuted = Color(0xFF64748B)
private val ProfileBorder = Color(0xFFE2E8F0)
private val ProfileDanger = Color(0xFFDC2626)
private val ProfileSuccess = Color(0xFF059669)
private val ProfileAmber = Color(0xFFD97706)

private enum class ProfileTab(val label: String, val icon: ImageVector) {
    Stats("统计", Icons.Default.BarChart),
    Errors("错题本", Icons.Default.ErrorOutline),
    Settings("设置", Icons.Default.Settings),
}

@Composable
internal fun ProfileScreen(
    api: WordMindApi,
    user: User,
    onOpenAdmin: () -> Unit,
    onUserUpdated: (User) -> Unit,
    onRefresh: () -> Unit,
    onLogout: () -> Unit,
) {
    var activeTab by rememberSaveable { mutableStateOf(ProfileTab.Stats) }
    var stats by remember { mutableStateOf<SpellingStats?>(null) }
    var errors by remember { mutableStateOf<List<SpellingErrorEntry>>(emptyList()) }
    var statsLoading by remember { mutableStateOf(true) }
    var errorsLoading by remember { mutableStateOf(true) }
    var loadingError by remember { mutableStateOf<String?>(null) }
    var editingNickname by remember { mutableStateOf(false) }
    var changingPassword by remember { mutableStateOf(false) }
    var clearingRecords by remember { mutableStateOf(false) }
    var notice by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    suspend fun loadProfile() {
        statsLoading = true
        errorsLoading = true
        loadingError = null
        try {
            val result = coroutineScope {
                val nextStats = async { api.getSpellingStats() }
                val nextErrors = async { api.getErrorBook() }
                nextStats.await() to nextErrors.await()
            }
            stats = result.first
            errors = result.second
        } catch (error: Exception) {
            error.rethrowIfCancellation()
            loadingError = error.message ?: "个人数据加载失败"
        } finally {
            statsLoading = false
            errorsLoading = false
        }
    }

    LaunchedEffect(Unit) {
        loadProfile()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 24.dp),
    ) {
        ProfileUserCard(
            user = user,
            onOpenAdmin = onOpenAdmin,
        )
        Spacer(Modifier.height(16.dp))

        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = Color(0xFFF1F5F9),
            shape = RoundedCornerShape(11.dp),
        ) {
            Row(
                modifier = Modifier.padding(4.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                ProfileTab.entries.forEach { tab ->
                    ProfileTabButton(
                        tab = tab,
                        selected = activeTab == tab,
                        errorCount = if (tab == ProfileTab.Errors) errors.size else 0,
                        modifier = Modifier.weight(1f),
                        onClick = { activeTab = tab },
                    )
                }
            }
        }
        Spacer(Modifier.height(16.dp))

        loadingError?.let { message ->
            ProfileMessage(
                text = message,
                danger = true,
                onDismiss = { loadingError = null },
            )
            Spacer(Modifier.height(12.dp))
        }

        when (activeTab) {
            ProfileTab.Stats -> ProfileStatsContent(
                stats = stats,
                loading = statsLoading,
            )
            ProfileTab.Errors -> ProfileErrorsContent(
                errors = errors,
                loading = errorsLoading,
            )
            ProfileTab.Settings -> ProfileSettingsContent(
                user = user,
                notice = notice,
                onDismissNotice = { notice = null },
                onEditNickname = {
                    notice = null
                    editingNickname = true
                },
                onChangePassword = {
                    notice = null
                    changingPassword = true
                },
                onClearRecords = {
                    notice = null
                    clearingRecords = true
                },
                onLogout = onLogout,
            )
        }
    }

    if (editingNickname) {
        EditNicknameDialog(
            api = api,
            user = user,
            onUpdated = {
                editingNickname = false
                onUserUpdated(it)
                notice = "昵称修改成功，下次请使用新昵称登录"
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
                scope.launch { loadProfile() }
            },
            onDismiss = { clearingRecords = false },
        )
    }
}

@Composable
private fun ProfileUserCard(
    user: User,
    onOpenAdmin: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, ProfileBorder),
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(
                modifier = Modifier.size(48.dp),
                shape = CircleShape,
                color = Color(0xFFEEF2FF),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        user.name.take(1).uppercase(),
                        color = ProfileIndigo,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
            Spacer(Modifier.width(11.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    user.name,
                    color = Color(0xFF111827),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    if (user.role == "admin") "管理员账号" else "学习账号",
                    color = ProfileMuted,
                    fontSize = 11.sp,
                )
            }
            if (user.role == "admin") {
                OutlinedButton(
                    onClick = onOpenAdmin,
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
                ) {
                    Icon(
                        Icons.Default.AdminPanelSettings,
                        contentDescription = null,
                        modifier = Modifier.size(15.dp),
                        tint = ProfileIndigo,
                    )
                    Spacer(Modifier.width(4.dp))
                    Text("管理后台", color = ProfileIndigo, fontSize = 11.sp)
                }
            }
        }
    }
}

@Composable
private fun ProfileTabButton(
    tab: ProfileTab,
    selected: Boolean,
    errorCount: Int,
    modifier: Modifier,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        modifier = modifier.height(42.dp),
        color = if (selected) Color.White else Color.Transparent,
        shape = RoundedCornerShape(8.dp),
        shadowElevation = if (selected) 1.dp else 0.dp,
    ) {
        Row(
            modifier = Modifier.fillMaxSize(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                tab.icon,
                contentDescription = null,
                tint = if (selected) ProfileIndigo else ProfileMuted,
                modifier = Modifier.size(17.dp),
            )
            Spacer(Modifier.width(5.dp))
            Text(
                tab.label,
                color = if (selected) ProfileIndigo else ProfileMuted,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
            )
            if (tab == ProfileTab.Errors && errorCount > 0) {
                Spacer(Modifier.width(4.dp))
                Surface(
                    color = Color(0xFFFEE2E2),
                    shape = CircleShape,
                ) {
                    Text(
                        errorCount.toString(),
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        color = ProfileDanger,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }
    }
}

@Composable
private fun ProfileStatsContent(
    stats: SpellingStats?,
    loading: Boolean,
) {
    if (loading && stats == null) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(220.dp),
            contentAlignment = Alignment.Center,
        ) {
            CircularProgressIndicator()
        }
        return
    }

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            ProfileStatCard(
                icon = Icons.Default.School,
                value = stats?.learningWords ?: 0,
                label = "学习中",
                color = ProfileSuccess,
                modifier = Modifier.weight(1f),
            )
            ProfileStatCard(
                icon = Icons.Default.PauseCircle,
                value = stats?.pausedWords ?: 0,
                label = "已暂停",
                color = ProfileAmber,
                modifier = Modifier.weight(1f),
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            ProfileStatCard(
                icon = Icons.Default.Schedule,
                value = stats?.manualDue ?: 0,
                label = "新学待复习",
                color = ProfileIndigo,
                modifier = Modifier.weight(1f),
            )
            ProfileStatCard(
                icon = Icons.Default.EmojiEvents,
                value = stats?.totalErrors ?: 0,
                label = "累计错题",
                color = Color(0xFFE11D48),
                modifier = Modifier.weight(1f),
            )
        }
        Spacer(Modifier.height(2.dp))
        ProfileLevelDistribution(stats)
    }
}

@Composable
private fun ProfileStatCard(
    icon: ImageVector,
    value: Int,
    label: String,
    color: Color,
    modifier: Modifier,
) {
    Card(
        modifier = modifier.height(112.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, ProfileBorder),
        shape = RoundedCornerShape(14.dp),
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(23.dp))
            Spacer(Modifier.height(4.dp))
            Text(
                value.toString(),
                color = Color(0xFF111827),
                fontSize = 23.sp,
                fontWeight = FontWeight.Bold,
            )
            Text(label, color = ProfileMuted, fontSize = 11.sp)
        }
    }
}

@Composable
private fun ProfileLevelDistribution(stats: SpellingStats?) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, ProfileBorder),
        shape = RoundedCornerShape(14.dp),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(
                "熟练度分布",
                color = Color(0xFF334155),
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(Modifier.height(14.dp))
            val levels = stats?.byLevel.orEmpty().sortedBy { it.level }
            if (levels.isEmpty()) {
                Text(
                    "暂无练习数据",
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp),
                    color = Color(0xFF94A3B8),
                    fontSize = 13.sp,
                )
            } else {
                val total = levels.sumOf { it.count }.coerceAtLeast(1)
                levels.forEachIndexed { index, item ->
                    val color = when (item.level) {
                        1 -> Color(0xFFEF4444)
                        2 -> Color(0xFFF59E0B)
                        else -> Color(0xFF22C55E)
                    }
                    val label = when (item.level) {
                        1 -> "陌生 (Lv.1)"
                        2 -> "熟悉 (Lv.2)"
                        else -> "掌握 (Lv.3)"
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(label, color = color, fontSize = 11.sp)
                        Text("${item.count} 词", color = ProfileMuted, fontSize = 11.sp)
                    }
                    Spacer(Modifier.height(6.dp))
                    LinearProgressIndicator(
                        progress = { item.count.toFloat() / total },
                        modifier = Modifier.fillMaxWidth(),
                        color = color,
                        trackColor = Color(0xFFF1F5F9),
                    )
                    if (index != levels.lastIndex) Spacer(Modifier.height(13.dp))
                }
            }
        }
    }
}

@Composable
private fun ProfileErrorsContent(
    errors: List<SpellingErrorEntry>,
    loading: Boolean,
) {
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
    if (errors.isEmpty()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 52.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(
                Icons.Default.CheckCircle,
                contentDescription = null,
                tint = Color(0xFFBBF7D0),
                modifier = Modifier.size(48.dp),
            )
            Spacer(Modifier.height(10.dp))
            Text("太棒了！还没有错题", color = ProfileMuted, fontSize = 13.sp)
        }
        return
    }

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        errors.forEach { error ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(1.dp, ProfileBorder),
                shape = RoundedCornerShape(14.dp),
            ) {
                Column(Modifier.padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = null,
                            tint = ProfileDanger,
                            modifier = Modifier.size(18.dp),
                        )
                        Spacer(Modifier.width(7.dp))
                        Text(
                            error.word,
                            modifier = Modifier.weight(1f),
                            color = Color(0xFF111827),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Spacer(Modifier.width(8.dp))
                        Surface(
                            color = when (error.level) {
                                1 -> Color(0xFFFEE2E2)
                                2 -> Color(0xFFFEF3C7)
                                else -> Color(0xFFD1FAE5)
                            },
                            shape = CircleShape,
                        ) {
                            Text(
                                when (error.level) {
                                    1 -> "Lv.1 陌生"
                                    2 -> "Lv.2 熟悉"
                                    else -> "Lv.3 掌握"
                                },
                                modifier = Modifier.padding(
                                    horizontal = 8.dp,
                                    vertical = 4.dp,
                                ),
                                color = when (error.level) {
                                    1 -> ProfileDanger
                                    2 -> ProfileAmber
                                    else -> ProfileSuccess
                                },
                                fontSize = 10.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                    Spacer(Modifier.height(7.dp))
                    Surface(
                        color = Color(0xFFFEF2F2),
                        shape = CircleShape,
                    ) {
                        Text(
                            "你写的：${error.userInput}",
                            modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp),
                            color = ProfileDanger,
                            fontSize = 10.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    error.phonetic?.takeIf { it.isNotBlank() }?.let { phonetic ->
                        Spacer(Modifier.height(7.dp))
                        Text(phonetic, color = Color(0xFF94A3B8), fontSize = 11.sp)
                    }
                    if (error.definition.isNotBlank()) {
                        Spacer(Modifier.height(4.dp))
                        Text(
                            error.definition,
                            color = ProfileMuted,
                            fontSize = 12.sp,
                            lineHeight = 18.sp,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ProfileSettingsContent(
    user: User,
    notice: String?,
    onDismissNotice: () -> Unit,
    onEditNickname: () -> Unit,
    onChangePassword: () -> Unit,
    onClearRecords: () -> Unit,
    onLogout: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        notice?.let {
            ProfileMessage(
                text = it,
                danger = false,
                onDismiss = onDismissNotice,
            )
        }
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            border = BorderStroke(1.dp, ProfileBorder),
            shape = RoundedCornerShape(14.dp),
        ) {
            Column {
                ProfileActionRow(
                    icon = Icons.Default.Edit,
                    title = "修改昵称",
                    subtitle = "当前昵称：${user.name}",
                    onClick = onEditNickname,
                )
                HorizontalDivider(color = ProfileBorder)
                ProfileActionRow(
                    icon = Icons.Default.Key,
                    title = "修改密码",
                    subtitle = "使用原密码设置新密码",
                    onClick = onChangePassword,
                )
                HorizontalDivider(color = ProfileBorder)
                ProfileActionRow(
                    icon = Icons.Default.Delete,
                    title = "清空学习记录",
                    subtitle = "清除当前账号的进度、错题与练习记录",
                    danger = true,
                    onClick = onClearRecords,
                )
                HorizontalDivider(color = ProfileBorder)
                ProfileActionRow(
                    icon = Icons.AutoMirrored.Filled.Logout,
                    title = "退出登录",
                    subtitle = "退出当前账号",
                    danger = true,
                    onClick = onLogout,
                )
            }
        }
    }
}

@Composable
private fun ProfileActionRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    danger: Boolean = false,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Surface(
            modifier = Modifier.size(38.dp),
            shape = RoundedCornerShape(10.dp),
            color = if (danger) Color(0xFFFEF2F2) else Color(0xFFEEF2FF),
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = if (danger) ProfileDanger else ProfileIndigo,
                    modifier = Modifier.size(19.dp),
                )
            }
        }
        Spacer(Modifier.width(11.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                title,
                color = if (danger) ProfileDanger else Color(0xFF111827),
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(Modifier.height(2.dp))
            Text(
                subtitle,
                color = ProfileMuted,
                fontSize = 11.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Icon(
            Icons.Default.ChevronRight,
            contentDescription = null,
            tint = Color(0xFFCBD5E1),
            modifier = Modifier.size(18.dp),
        )
    }
}

@Composable
private fun ProfileMessage(
    text: String,
    danger: Boolean,
    onDismiss: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = if (danger) Color(0xFFFEF2F2) else Color(0xFFECFDF5),
        border = BorderStroke(
            1.dp,
            if (danger) Color(0xFFFECACA) else Color(0xFFA7F3D0),
        ),
        shape = RoundedCornerShape(12.dp),
    ) {
        Row(
            modifier = Modifier.padding(start = 13.dp, top = 9.dp, bottom = 9.dp, end = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text,
                modifier = Modifier.weight(1f),
                color = if (danger) ProfileDanger else ProfileSuccess,
                fontSize = 12.sp,
            )
            IconButton(onClick = onDismiss, modifier = Modifier.size(34.dp)) {
                Icon(
                    Icons.Default.Close,
                    contentDescription = "关闭",
                    tint = if (danger) ProfileDanger else ProfileSuccess,
                    modifier = Modifier.size(17.dp),
                )
            }
        }
    }
}
