package com.wordmind.app.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import com.wordmind.app.data.User
import com.wordmind.app.data.WordMindApi
import kotlinx.coroutines.launch

private val DialogDanger = Color(0xFFDC2626)

@Composable
internal fun EditNicknameDialog(
    api: WordMindApi,
    user: User,
    onUpdated: (User) -> Unit,
    onDismiss: () -> Unit,
) {
    var name by rememberSaveable(user.id) { mutableStateOf(user.name) }
    var error by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun save() {
        val trimmedName = name.trim()
        error = when {
            trimmedName.isBlank() -> "请输入昵称"
            trimmedName.length > 20 -> "昵称最多20个字符"
            trimmedName == user.name -> "昵称没有变化"
            else -> null
        }
        if (error != null || saving) return

        saving = true
        scope.launch {
            try {
                onUpdated(api.updateName(trimmedName))
            } catch (exception: Exception) {
                error = exception.message ?: "昵称修改失败"
            } finally {
                saving = false
            }
        }
    }

    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        title = { Text("修改昵称") },
        text = {
            Column {
                Text("昵称也是登录账号，修改后请使用新昵称登录。")
                Spacer(Modifier.height(14.dp))
                OutlinedTextField(
                    value = name,
                    onValueChange = {
                        name = it
                        error = null
                    },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("昵称") },
                    supportingText = error?.let { message -> ({ Text(message, color = DialogDanger) }) },
                    singleLine = true,
                    enabled = !saving,
                )
            }
        },
        confirmButton = {
            Button(onClick = { save() }, enabled = !saving) {
                if (saving) {
                    CircularProgressIndicator(
                        modifier = Modifier.height(18.dp),
                        color = Color.White,
                        strokeWidth = 2.dp,
                    )
                } else {
                    Text("保存")
                }
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss, enabled = !saving) {
                Text("取消")
            }
        },
    )
}

@Composable
internal fun ChangePasswordDialog(
    api: WordMindApi,
    onChanged: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    var oldPassword by rememberSaveable { mutableStateOf("") }
    var newPassword by rememberSaveable { mutableStateOf("") }
    var confirmPassword by rememberSaveable { mutableStateOf("") }
    var passwordVisible by rememberSaveable { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun save() {
        error = when {
            oldPassword.isBlank() -> "请输入原密码"
            newPassword.length < 6 -> "新密码至少6位字符"
            newPassword != confirmPassword -> "两次输入的新密码不一致"
            else -> null
        }
        if (error != null || saving) return

        saving = true
        scope.launch {
            try {
                onChanged(api.changePassword(oldPassword, newPassword))
            } catch (exception: Exception) {
                error = exception.message ?: "密码修改失败"
            } finally {
                saving = false
            }
        }
    }

    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        title = { Text("修改密码") },
        text = {
            Column {
                error?.let {
                    Text(it, color = DialogDanger)
                    Spacer(Modifier.height(10.dp))
                }
                PasswordField(
                    value = oldPassword,
                    label = "原密码",
                    visible = passwordVisible,
                    enabled = !saving,
                    onValueChange = {
                        oldPassword = it
                        error = null
                    },
                )
                Spacer(Modifier.height(10.dp))
                PasswordField(
                    value = newPassword,
                    label = "新密码（至少6位）",
                    visible = passwordVisible,
                    enabled = !saving,
                    onValueChange = {
                        newPassword = it
                        error = null
                    },
                )
                Spacer(Modifier.height(10.dp))
                PasswordField(
                    value = confirmPassword,
                    label = "确认新密码",
                    visible = passwordVisible,
                    enabled = !saving,
                    onValueChange = {
                        confirmPassword = it
                        error = null
                    },
                )
                TextButton(
                    onClick = { passwordVisible = !passwordVisible },
                    enabled = !saving,
                ) {
                    Text(if (passwordVisible) "隐藏密码" else "显示密码")
                }
            }
        },
        confirmButton = {
            Button(onClick = { save() }, enabled = !saving) {
                if (saving) {
                    CircularProgressIndicator(
                        modifier = Modifier.height(18.dp),
                        color = Color.White,
                        strokeWidth = 2.dp,
                    )
                } else {
                    Text("确认修改")
                }
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss, enabled = !saving) {
                Text("取消")
            }
        },
    )
}

@Composable
private fun PasswordField(
    value: String,
    label: String,
    visible: Boolean,
    enabled: Boolean,
    onValueChange: (String) -> Unit,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = Modifier.fillMaxWidth(),
        label = { Text(label) },
        singleLine = true,
        enabled = enabled,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        visualTransformation = if (visible) {
            VisualTransformation.None
        } else {
            PasswordVisualTransformation()
        },
    )
}

@Composable
internal fun ClearLearningRecordsDialog(
    api: WordMindApi,
    onCleared: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    var clearing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun clear() {
        if (clearing) return
        clearing = true
        scope.launch {
            try {
                onCleared(api.clearLearningRecords())
            } catch (exception: Exception) {
                error = exception.message ?: "清空失败"
            } finally {
                clearing = false
            }
        }
    }

    AlertDialog(
        onDismissRequest = { if (!clearing) onDismiss() },
        title = { Text("清空学习记录？") },
        text = {
            Column {
                Text("将清空当前账号的学习队列、复习进度、错题、练习场次和今日选词。")
                Spacer(Modifier.height(8.dp))
                Text("共享单词、课本和其他账号的数据不会删除。")
                error?.let {
                    Spacer(Modifier.height(10.dp))
                    Text(it, color = DialogDanger)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { clear() },
                enabled = !clearing,
                colors = ButtonDefaults.buttonColors(containerColor = DialogDanger),
            ) {
                if (clearing) {
                    CircularProgressIndicator(
                        modifier = Modifier.height(18.dp),
                        color = Color.White,
                        strokeWidth = 2.dp,
                    )
                } else {
                    Text("确认清空")
                }
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss, enabled = !clearing) {
                Text("取消")
            }
        },
    )
}
