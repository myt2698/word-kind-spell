package com.wordmind.app.data

import org.json.JSONArray
import org.json.JSONObject

data class User(
    val id: Int,
    val name: String,
    val role: String,
)

data class UnitGroup(
    val id: Int,
    val name: String,
    val description: String?,
    val textbookId: Int?,
    val wordCount: Int,
)

data class Textbook(
    val id: Int,
    val name: String,
    val description: String?,
    val groupCount: Int,
    val groups: List<UnitGroup>,
)

data class Tag(
    val id: Int,
    val name: String,
    val description: String? = null,
    val wordCount: Int = 0,
)

data class WordGroupMembership(
    val groupId: Int,
    val groupName: String,
    val textbookId: Int,
    val textbookName: String,
)

data class Word(
    val id: Int,
    val word: String,
    val phonetic: String?,
    val definition: String,
    val example: String?,
    val notes: String?,
    val learningStatus: String,
    val groupId: Int?,
    val textbookId: Int?,
    val textbookName: String,
    val groupName: String?,
    val groups: List<WordGroupMembership>,
    val tags: List<Tag>,
)

data class CatalogData(
    val textbooks: List<Textbook>,
    val words: List<Word>,
    val tags: List<Tag>,
)

data class WordDraft(
    val word: String,
    val phonetic: String,
    val definition: String,
    val example: String,
    val notes: String,
    val groupIds: List<Int>,
    val tagIds: List<Int>,
)

data class PracticeWord(
    val id: Int,
    val word: String,
    val phonetic: String?,
    val definition: String,
    val example: String?,
    val notes: String?,
    val level: Int,
    val streak: Int,
    val errorCount: Int,
    val totalAttempts: Int,
    val totalCorrect: Int,
    val source: String,
    val tags: List<Tag>,
    val phonics: StudyPhonicsAnalysis,
)

data class StudyPhonicsAnalysis(
    val syllables: List<String>,
    val blocks: List<StudyPhonicsBlock>,
    val patterns: List<StudyPhonicsPattern>,
)

data class StudyPhonicsBlock(
    val letters: String,
    val comboType: String?,
    val isCombo: Boolean,
)

data class StudyPhonicsPattern(
    val type: String,
    val text: String,
    val explanation: String,
)

data class DailyReading(
    val date: String,
    val words: List<String>,
    val stories: List<ReadingStory>,
)

data class ReadingStory(
    val title: String,
    val theme: String,
    val content: String,
    val questions: List<ReadingQuestion>,
)

data class ReadingQuestion(
    val question: String,
    val options: List<String>,
    val correctIndex: Int,
)

internal fun JSONObject.toDailyReading(): DailyReading {
    val wordsJson = optJSONArray("words") ?: JSONArray()
    val storiesJson = optJSONArray("stories") ?: JSONArray()
    return DailyReading(
        date = optString("date"),
        words = buildList {
            for (index in 0 until wordsJson.length()) add(wordsJson.optString(index))
        },
        stories = buildList {
            for (storyIndex in 0 until storiesJson.length()) {
                val story = storiesJson.getJSONObject(storyIndex)
                val questionsJson = story.optJSONArray("questions") ?: JSONArray()
                add(
                    ReadingStory(
                        title = story.optString("title"),
                        theme = story.optString("theme"),
                        content = story.optString("content"),
                        questions = buildList {
                            for (questionIndex in 0 until questionsJson.length()) {
                                val question = questionsJson.getJSONObject(questionIndex)
                                val optionsJson = question.optJSONArray("options") ?: JSONArray()
                                add(
                                    ReadingQuestion(
                                        question = question.optString("question"),
                                        options = buildList {
                                            for (optionIndex in 0 until optionsJson.length()) {
                                                add(optionsJson.optString(optionIndex))
                                            }
                                        },
                                        correctIndex = question.optInt("correctIndex"),
                                    )
                                )
                            }
                        },
                    )
                )
            }
        },
    )
}

data class SpellingStats(
    val totalWords: Int,
    val learningWords: Int,
    val pausedWords: Int,
    val manualDue: Int,
    val dueForReview: Int,
    val totalErrors: Int,
    val todaySessions: Int,
    val totalPoints: Int,
    val todayPoints: Int,
    val byLevel: List<SpellingLevelStat>,
)

data class SpellingReward(
    val pointsEarned: Int,
    val rewardCapped: Boolean,
)

data class SpellingLevelStat(
    val level: Int,
    val count: Int,
)

data class SpellingErrorEntry(
    val id: Int,
    val wordId: Int,
    val word: String,
    val phonetic: String?,
    val definition: String,
    val level: Int,
    val userInput: String,
    val errorType: String,
    val practiceMode: String,
)

internal fun JSONObject.nullableString(key: String): String? {
    if (isNull(key)) return null
    return optString(key).takeIf { it.isNotBlank() && it != "null" }
}

internal fun JSONArray.toTextbooks(): List<Textbook> = buildList {
    for (index in 0 until length()) {
        val item = getJSONObject(index)
        val groupsJson = item.optJSONArray("groups") ?: JSONArray()
        val groups = buildList {
            for (groupIndex in 0 until groupsJson.length()) {
                val group = groupsJson.getJSONObject(groupIndex)
                add(
                    UnitGroup(
                        id = group.getInt("id"),
                        name = group.optString("name", "Unit"),
                        description = group.nullableString("description"),
                        textbookId = if (group.isNull("textbookId")) {
                            null
                        } else {
                            group.optInt("textbookId")
                        },
                        wordCount = group.optInt("wordCount"),
                    )
                )
            }
        }
        add(
            Textbook(
                id = item.getInt("id"),
                name = item.optString("name", "未命名课本"),
                description = item.nullableString("description"),
                groupCount = item.optInt("groupCount", groups.size),
                groups = groups,
            )
        )
    }
}

internal fun JSONArray.toWords(): List<Word> = buildList {
    for (index in 0 until length()) {
        val item = getJSONObject(index)
        val tagsJson = item.optJSONArray("tags") ?: JSONArray()
        val tags = buildList {
            for (tagIndex in 0 until tagsJson.length()) {
                val tag = tagsJson.getJSONObject(tagIndex)
                add(
                    Tag(
                        id = tag.getInt("id"),
                        name = tag.optString("name"),
                        description = tag.nullableString("description"),
                        wordCount = tag.optInt("wordCount"),
                    )
                )
            }
        }
        val groupsJson = item.optJSONArray("groups") ?: JSONArray()
        val groups = buildList {
            for (groupIndex in 0 until groupsJson.length()) {
                val group = groupsJson.getJSONObject(groupIndex)
                add(
                    WordGroupMembership(
                        groupId = group.getInt("groupId"),
                        groupName = group.optString("groupName", "Unit"),
                        textbookId = group.getInt("textbookId"),
                        textbookName = group.optString("textbookName", "课本"),
                    )
                )
            }
        }
        add(
            Word(
                id = item.getInt("id"),
                word = item.optString("word"),
                phonetic = item.nullableString("phonetic"),
                definition = item.optString("definition"),
                example = item.nullableString("example"),
                notes = item.nullableString("notes"),
                learningStatus = item.optString("learningStatus", "idle"),
                groupId = if (item.isNull("groupId")) null else item.optInt("groupId"),
                textbookId = if (item.isNull("textbookId")) null else item.optInt("textbookId"),
                textbookName = item.optString("textbookName", "扩展词汇"),
                groupName = item.nullableString("groupName"),
                groups = groups,
                tags = tags,
            )
        )
    }
}

internal fun JSONArray.toTags(): List<Tag> = buildList {
    for (index in 0 until length()) {
        val item = getJSONObject(index)
        add(
            Tag(
                id = item.getInt("id"),
                name = item.optString("name"),
                description = item.nullableString("description"),
                wordCount = item.optInt("wordCount"),
            )
        )
    }
}

internal fun JSONArray.toPracticeWords(): List<PracticeWord> = buildList {
    for (index in 0 until length()) {
        val item = getJSONObject(index)
        val tagsJson = item.optJSONArray("tags") ?: JSONArray()
        val wordTags = buildList {
            for (tagIndex in 0 until tagsJson.length()) {
                val tag = tagsJson.getJSONObject(tagIndex)
                add(
                    Tag(
                        id = tag.getInt("id"),
                        name = tag.optString("name"),
                        description = tag.nullableString("description"),
                        wordCount = tag.optInt("wordCount"),
                    )
                )
            }
        }
        val phonicsJson = item.optJSONObject("phonics")
        val syllablesJson = phonicsJson?.optJSONArray("syllables") ?: JSONArray()
        val syllables = buildList {
            for (syllableIndex in 0 until syllablesJson.length()) {
                add(syllablesJson.optString(syllableIndex))
            }
        }
        val blocksJson = phonicsJson?.optJSONArray("blocks") ?: JSONArray()
        val blocks = buildList {
            for (blockIndex in 0 until blocksJson.length()) {
                val block = blocksJson.getJSONObject(blockIndex)
                add(
                    StudyPhonicsBlock(
                        letters = block.optString("letters"),
                        comboType = block.nullableString("comboType"),
                        isCombo = block.optBoolean("isCombo"),
                    )
                )
            }
        }
        val patternsJson = phonicsJson?.optJSONArray("patterns") ?: JSONArray()
        val patterns = buildList {
            for (patternIndex in 0 until patternsJson.length()) {
                val pattern = patternsJson.getJSONObject(patternIndex)
                add(
                    StudyPhonicsPattern(
                        type = pattern.optString("type"),
                        text = pattern.optString("text"),
                        explanation = pattern.optString("explanation"),
                    )
                )
            }
        }
        add(
            PracticeWord(
                id = item.getInt("id"),
                word = item.optString("word"),
                phonetic = item.nullableString("phonetic"),
                definition = item.optString("definition"),
                example = item.nullableString("example"),
                notes = item.nullableString("notes"),
                level = item.optInt("level", 1),
                streak = item.optInt("streak"),
                errorCount = item.optInt("errorCount"),
                totalAttempts = item.optInt("totalAttempts"),
                totalCorrect = item.optInt("totalCorrect"),
                source = item.optString("source", "auto"),
                tags = wordTags,
                phonics = StudyPhonicsAnalysis(
                    syllables = syllables,
                    blocks = blocks,
                    patterns = patterns,
                ),
            )
        )
    }
}
