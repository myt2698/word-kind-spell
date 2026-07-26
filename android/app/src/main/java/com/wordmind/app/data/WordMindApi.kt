package com.wordmind.app.data

import android.content.Context
import com.wordmind.app.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URLEncoder
import java.net.URL
import java.nio.charset.StandardCharsets

class ApiException(message: String, val statusCode: Int = 0) : IOException(message)

class WordMindApi(context: Context) {
    private val preferences = context.getSharedPreferences("wordmind_session", Context.MODE_PRIVATE)
    private val baseUrl = BuildConfig.API_BASE_URL.trimEnd('/')

    suspend fun restoreUser(): User? {
        if (preferences.getString(COOKIE_KEY, null).isNullOrBlank()) return null
        return try {
            me()
        } catch (error: ApiException) {
            if (error.statusCode == HttpURLConnection.HTTP_UNAUTHORIZED) {
                clearSession()
                null
            } else {
                throw error
            }
        }
    }

    suspend fun login(name: String, password: String): User {
        val result = mutate(
            "auth.login",
            JSONObject().put("name", name.trim()).put("password", password),
        ) as JSONObject
        if (!result.optBoolean("success")) {
            throw ApiException(result.optString("message", "登录失败"))
        }
        return me()
    }

    suspend fun register(name: String, password: String): User {
        val result = mutate(
            "auth.register",
            JSONObject().put("name", name.trim()).put("password", password),
        ) as JSONObject
        if (!result.optBoolean("success")) {
            throw ApiException(result.optString("message", "注册失败"))
        }
        return me()
    }

    suspend fun me(): User {
        val json = query("auth.me") as JSONObject
        return User(
            id = json.getInt("id"),
            name = json.optString("name"),
            role = json.optString("role", "user"),
        )
    }

    suspend fun loadCatalog(): CatalogData = coroutineScope {
        val textbooks = async { (query("textbook.list") as JSONArray).toTextbooks() }
        // word.list accepts an optional object, but tRPC distinguishes an omitted/empty
        // object from JSON null. Sending null fails Zod validation and aborts the whole
        // parallel catalog load.
        val words = async { (query("word.list", JSONObject()) as JSONArray).toWords() }
        val tags = async { (query("tag.listWithCount") as JSONArray).toTags() }
        CatalogData(
            textbooks = textbooks.await(),
            words = words.await(),
            tags = tags.await(),
        )
    }

    suspend fun setLearning(wordId: Int, active: Boolean) {
        mutate(
            if (active) "spelling.addToLearning" else "spelling.removeFromLearning",
            JSONObject().put("wordId", wordId),
        )
    }

    suspend fun saveWord(id: Int?, draft: WordDraft) {
        val input = JSONObject()
            .put("word", draft.word.trim())
            .put("phonetic", draft.phonetic.trim())
            .put("definition", draft.definition.trim())
            .put("example", draft.example.trim())
            .put("notes", draft.notes.trim())
            .put("tagIds", JSONArray(draft.tagIds))
        if (id == null) {
            draft.groupId?.let { input.put("groupId", it) }
            mutate("word.create", input)
        } else {
            input.put("id", id)
            input.put("groupId", draft.groupId ?: JSONObject.NULL)
            mutate("word.update", input)
        }
    }

    suspend fun deleteWord(id: Int) {
        mutate("word.delete", JSONObject().put("id", id))
    }

    suspend fun saveTextbook(id: Int?, name: String, description: String) {
        val input = JSONObject()
            .put("name", name.trim())
            .put("description", description.trim())
        if (id == null) {
            mutate("textbook.create", input)
        } else {
            input.put("id", id)
            mutate("textbook.update", input)
        }
    }

    suspend fun deleteTextbook(id: Int) {
        mutate("textbook.delete", JSONObject().put("id", id))
    }

    suspend fun saveUnit(
        id: Int?,
        textbookId: Int,
        name: String,
        description: String,
    ) {
        val input = JSONObject()
            .put("name", name.trim())
            .put("description", description.trim())
            .put("textbookId", textbookId)
        if (id == null) {
            mutate("wordGroup.create", input)
        } else {
            input.put("id", id)
            mutate("wordGroup.update", input)
        }
    }

    suspend fun deleteUnit(id: Int) {
        mutate("wordGroup.delete", JSONObject().put("id", id))
    }

    suspend fun saveTag(id: Int?, name: String, description: String) {
        val input = JSONObject()
            .put("name", name.trim())
            .put("description", description.trim())
        if (id == null) {
            mutate("tag.create", input)
        } else {
            input.put("id", id)
            mutate("tag.update", input)
        }
    }

    suspend fun deleteTag(id: Int) {
        mutate("tag.delete", JSONObject().put("id", id))
    }

    suspend fun getReviewQueue(): List<PracticeWord> =
        (query("spelling.getReviewQueue") as JSONArray).toPracticeWords()

    suspend fun getLearningQueue(): List<PracticeWord> =
        (query("spelling.getLearningQueue") as JSONArray).toPracticeWords()

    suspend fun getErrorWords(): List<PracticeWord> =
        (query("spelling.getErrorWords") as JSONArray).toPracticeWords()

    suspend fun getErrorBook(): List<SpellingErrorEntry> {
        val result = query("spelling.getErrorBook") as JSONArray
        return buildList {
            for (index in 0 until result.length()) {
                val item = result.getJSONObject(index)
                add(
                    SpellingErrorEntry(
                        id = item.getInt("id"),
                        wordId = item.getInt("wordId"),
                        word = item.optString("word"),
                        phonetic = item.nullableString("phonetic"),
                        definition = item.optString("definition"),
                        userInput = item.optString("userInput"),
                        errorType = item.optString("errorType", "other"),
                        practiceMode = item.optString("practiceMode"),
                    )
                )
            }
        }
    }

    suspend fun getTodaySelections(): List<Int> {
        val result = query("spelling.getTodaySelections") as JSONArray
        return buildList {
            for (index in 0 until result.length()) {
                add(result.getInt(index))
            }
        }
    }

    suspend fun setTodaySelections(wordIds: List<Int>) {
        mutate(
            "spelling.setTodaySelections",
            JSONObject().put("wordIds", JSONArray(wordIds)),
        )
    }

    suspend fun clearSpellingErrors(wordId: Int) {
        mutate(
            "spelling.clearErrors",
            JSONObject().put("wordId", wordId),
        )
    }

    suspend fun getSpellingStats(): SpellingStats {
        val result = query("spelling.getStats") as JSONObject
        val byLevelJson = result.optJSONArray("byLevel") ?: JSONArray()
        val byLevel = buildList {
            for (index in 0 until byLevelJson.length()) {
                val item = byLevelJson.getJSONObject(index)
                add(
                    SpellingLevelStat(
                        level = item.optInt("level", 1),
                        count = item.optInt("count"),
                    )
                )
            }
        }
        return SpellingStats(
            totalWords = result.optInt("totalWords"),
            learningWords = result.optInt("learningWords"),
            pausedWords = result.optInt("pausedWords"),
            manualDue = result.optInt("manualDue"),
            dueForReview = result.optInt("dueForReview"),
            totalErrors = result.optInt("totalErrors"),
            todaySessions = result.optInt("todaySessions"),
            byLevel = byLevel,
        )
    }

    suspend fun submitSpellingResult(
        wordId: Int,
        correct: Boolean,
        userInput: String,
        durationMs: Long,
        practiceMode: String,
    ) {
        mutate(
            "spelling.submitResult",
            JSONObject()
                .put("wordId", wordId)
                .put("isCorrect", correct)
                .put("userInput", userInput)
                .put("practiceMode", practiceMode)
                .put("duration", durationMs),
        )
    }

    suspend fun changePassword(oldPassword: String, newPassword: String): String {
        val result = mutate(
            "auth.changePassword",
            JSONObject()
                .put("oldPassword", oldPassword)
                .put("newPassword", newPassword),
        ) as JSONObject
        if (!result.optBoolean("success")) {
            throw ApiException(result.optString("message", "修改失败"))
        }
        return result.optString("message", "密码修改成功")
    }

    suspend fun updateName(name: String): User {
        val result = mutate(
            "auth.updateName",
            JSONObject().put("name", name.trim()),
        ) as JSONObject
        if (!result.optBoolean("success")) {
            throw ApiException(result.optString("message", "昵称修改失败"))
        }
        return me()
    }

    suspend fun clearLearningRecords(): String {
        val result = mutate("spelling.clearLearningRecords", null) as JSONObject
        if (!result.optBoolean("success")) {
            throw ApiException(result.optString("message", "清空失败"))
        }
        return result.optString("message", "学习记录已清空")
    }

    suspend fun logout() {
        try {
            mutate("auth.logout", null)
        } finally {
            clearSession()
        }
    }

    private suspend fun query(procedure: String, input: JSONObject? = null): Any =
        request("GET", procedure, input)

    private suspend fun mutate(procedure: String, input: JSONObject?): Any =
        request("POST", procedure, input)

    private suspend fun request(method: String, procedure: String, input: JSONObject?): Any =
        withContext(Dispatchers.IO) {
            val envelope = JSONObject().put("json", input ?: JSONObject.NULL).toString()
            val suffix = if (method == "GET") {
                "?input=${URLEncoder.encode(envelope, StandardCharsets.UTF_8.name())}"
            } else {
                ""
            }
            val connection = URL("$baseUrl/api/trpc/$procedure$suffix")
                .openConnection() as HttpURLConnection

            try {
                connection.requestMethod = method
                connection.connectTimeout = 20_000
                connection.readTimeout = 30_000
                connection.setRequestProperty("Accept", "application/json")
                connection.setRequestProperty("X-TRPC-Source", "wordmind-android-native")
                preferences.getString(COOKIE_KEY, null)?.let {
                    connection.setRequestProperty("Cookie", it)
                }

                if (method == "POST") {
                    connection.doOutput = true
                    connection.setRequestProperty("Content-Type", "application/json")
                    connection.outputStream.bufferedWriter(StandardCharsets.UTF_8).use {
                        it.write(envelope)
                    }
                }

                val status = connection.responseCode
                persistCookie(connection)
                val stream = if (status in 200..299) connection.inputStream else connection.errorStream
                val body = stream?.bufferedReader(StandardCharsets.UTF_8)?.use { it.readText() }.orEmpty()
                val payload = try {
                    JSONObject(body)
                } catch (_: Exception) {
                    throw ApiException(if (body.isBlank()) "服务器没有返回数据" else body, status)
                }

                if (status !in 200..299 || payload.has("error")) {
                    val message = payload.optJSONObject("error")
                        ?.optJSONObject("json")
                        ?.optString("message")
                        ?.takeIf { it.isNotBlank() }
                        ?: "请求失败（$status）"
                    throw ApiException(message, status)
                }

                val data = payload.getJSONObject("result").getJSONObject("data")
                if (data.isNull("json")) JSONObject.NULL else data.get("json")
            } finally {
                connection.disconnect()
            }
        }

    private fun persistCookie(connection: HttpURLConnection) {
        val setCookie = connection.headerFields.entries
            .firstOrNull { it.key?.equals("set-cookie", ignoreCase = true) == true }
            ?.value
            ?.firstOrNull()
            ?: return
        val cookie = setCookie.substringBefore(';')
        if (cookie.startsWith("$SESSION_COOKIE=") && cookie.substringAfter('=').isNotBlank()) {
            preferences.edit().putString(COOKIE_KEY, cookie).apply()
        } else if (cookie.startsWith("$SESSION_COOKIE=")) {
            clearSession()
        }
    }

    private fun clearSession() {
        preferences.edit().remove(COOKIE_KEY).apply()
    }

    private companion object {
        const val COOKIE_KEY = "session_cookie"
        const val SESSION_COOKIE = "kimi_sid"
    }
}
