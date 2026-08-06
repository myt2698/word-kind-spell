package com.wordmind.app.ui

import android.graphics.BitmapFactory
import android.net.Uri
import android.widget.MediaController
import android.widget.VideoView
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.PlayCircleOutline
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.wordmind.app.data.RestEpisode
import com.wordmind.app.data.RestSeries
import com.wordmind.app.data.WordMindApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.launch
import java.net.HttpURLConnection
import java.net.URL

private val RestInk = Color(0xFF353143)
private val RestMuted = Color(0xFF908B9C)
private val RestLavender = Color(0xFF746DCC)
private val RestLavenderSoft = Color(0xFFF1EFFF)
private val RestDivider = Color(0xFFEFEDF4)

@Composable
internal fun RestMode(
    api: WordMindApi,
    onBack: () -> Unit,
    onMessage: (String) -> Unit,
) {
    var series by remember { mutableStateOf<List<RestSeries>>(emptyList()) }
    var selectedSeries by remember { mutableStateOf<RestSeries?>(null) }
    var selectedEpisode by remember { mutableStateOf<RestEpisode?>(null) }
    var loading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        try {
            series = api.getRestSeries()
        } catch (error: Exception) {
            error.rethrowIfCancellation()
            onMessage(error.message ?: "短片加载失败")
        } finally {
            loading = false
        }
    }

    selectedEpisode?.let { episode ->
        RestPlayer(
            series = selectedSeries ?: return@let,
            episode = episode,
            onBack = { selectedEpisode = null },
        )
        return
    }

    selectedSeries?.let { detail ->
        RestEpisodeList(
            series = detail,
            onBack = { selectedSeries = null },
            onEpisode = { selectedEpisode = it },
        )
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White),
    ) {
        RestHeader(
            title = "休息小站",
            subtitle = "选一部动画，再挑选具体集数",
            onBack = onBack,
        )
        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = RestLavender)
            }
            series.isEmpty() -> RestEmpty()
            else -> LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(
                    start = 20.dp,
                    end = 20.dp,
                    top = 10.dp,
                    bottom = 32.dp,
                ),
            ) {
                items(series, key = { it.id }) { item ->
                    RestSeriesRow(item = item) {
                        loading = true
                        scope.launch {
                            try {
                                selectedSeries = api.getRestSeries(item.id)
                            } catch (error: Exception) {
                                error.rethrowIfCancellation()
                                onMessage(error.message ?: "集数加载失败")
                            } finally {
                                loading = false
                            }
                        }
                    }
                    HorizontalDivider(color = RestDivider)
                }
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 26.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        HorizontalDivider(modifier = Modifier.width(20.dp), color = Color(0xFFDCD8EB))
                        Text(
                            "点选短片可查看全部集数",
                            modifier = Modifier.padding(horizontal = 10.dp),
                            color = Color(0xFFA7A2B0),
                            fontSize = 11.sp,
                        )
                        HorizontalDivider(modifier = Modifier.width(20.dp), color = Color(0xFFDCD8EB))
                    }
                }
            }
        }
    }
}

@Composable
private fun RestHeader(title: String, subtitle: String, onBack: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(88.dp)
            .padding(horizontal = 20.dp),
    ) {
        Card(
            onClick = onBack,
            modifier = Modifier
                .size(44.dp)
                .align(Alignment.CenterStart),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = RestLavenderSoft),
            elevation = CardDefaults.cardElevation(0.dp),
        ) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "返回",
                    tint = Color(0xFF6F67BA),
                    modifier = Modifier.size(20.dp),
                )
            }
        }
        Column(
            modifier = Modifier.align(Alignment.Center),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(title, color = Color(0xFF2D2A3F), fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(3.dp))
            Text(subtitle, color = Color(0xFF8D899F), fontSize = 11.sp)
        }
    }
}

@Composable
private fun RestSeriesRow(item: RestSeries, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RemoteRestImage(
            url = item.coverUrl,
            description = "${item.title}封面",
            modifier = Modifier
                .width(158.dp)
                .height(105.dp)
                .clip(RoundedCornerShape(16.dp)),
        )
        Spacer(Modifier.width(16.dp))
        Column(Modifier.weight(1f)) {
            Text(
                item.title,
                color = RestInk,
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(8.dp))
            Text("共 ${item.episodeCount} 集", color = RestMuted, fontSize = 12.sp)
        }
        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Color(0xFFA39ECB))
    }
}

@Composable
private fun RestEpisodeList(
    series: RestSeries,
    onBack: () -> Unit,
    onEpisode: (RestEpisode) -> Unit,
) {
    Column(Modifier.fillMaxSize().background(Color.White)) {
        RestHeader(series.title, "共 ${series.episodeCount} 集，选一集慢慢看", onBack)
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(
                start = 20.dp,
                end = 20.dp,
                top = 10.dp,
                bottom = 32.dp,
            ),
        ) {
            item {
                RemoteRestImage(
                    url = series.coverUrl,
                    description = "${series.title}封面",
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(2f)
                        .clip(RoundedCornerShape(20.dp)),
                )
                Spacer(Modifier.height(22.dp))
            }
            items(series.episodes, key = { it.id }) { episode ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onEpisode(episode) }
                        .padding(vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier = Modifier.size(40.dp).background(RestLavenderSoft, CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("${episode.episodeNumber}", color = RestLavender, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) {
                        Text(episode.title, color = RestInk, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                        formatRestDuration(episode.durationSeconds)?.let {
                            Spacer(Modifier.height(3.dp))
                            Text(it, color = Color(0xFF9A96A8), fontSize = 11.sp)
                        }
                    }
                    Icon(Icons.Default.PlayCircleOutline, contentDescription = "播放", tint = Color(0xFF9A94CF))
                }
                HorizontalDivider(color = RestDivider)
            }
        }
    }
}

@Composable
private fun RestPlayer(series: RestSeries, episode: RestEpisode, onBack: () -> Unit) {
    Column(Modifier.fillMaxSize().background(Color.White)) {
        RestHeader(episode.title, series.title, onBack)
        Column(Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
            AndroidView(
                factory = { context ->
                    VideoView(context).apply {
                        val controller = MediaController(context)
                        controller.setAnchorView(this)
                        setMediaController(controller)
                    }
                },
                update = { view ->
                    if (view.tag != episode.videoUrl) {
                        view.tag = episode.videoUrl
                        view.setVideoURI(Uri.parse(episode.videoUrl))
                        view.setOnPreparedListener { player -> player.isLooping = false }
                    }
                },
                onRelease = { it.stopPlayback() },
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color.Black),
            )
            Spacer(Modifier.height(18.dp))
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFAF9FF)),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEBE9F4)),
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text("第 ${episode.episodeNumber} 集 · ${episode.title}", color = RestInk, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "播放结束后不会自动连播。想继续看时，再回到集数列表自己选择。",
                        color = Color(0xFF827E92),
                        fontSize = 13.sp,
                        lineHeight = 20.sp,
                    )
                }
            }
        }
    }
}

@Composable
private fun RemoteRestImage(url: String, description: String, modifier: Modifier) {
    val image by produceState<androidx.compose.ui.graphics.ImageBitmap?>(initialValue = null, url) {
        value = withContext(Dispatchers.IO) {
            runCatching {
                val connection = URL(url).openConnection() as HttpURLConnection
                connection.connectTimeout = 10_000
                connection.readTimeout = 15_000
                connection.inputStream.use { BitmapFactory.decodeStream(it)?.asImageBitmap() }
            }.getOrNull()
        }
    }
    Box(modifier.background(Color(0xFFF4F2FB)), contentAlignment = Alignment.Center) {
        if (image != null) {
            Image(image!!, contentDescription = description, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        } else {
            Icon(Icons.Default.Movie, contentDescription = null, tint = Color(0xFFAAA4CB), modifier = Modifier.size(28.dp))
        }
    }
}

@Composable
private fun RestEmpty() {
    Column(
        modifier = Modifier.fillMaxSize().padding(horizontal = 42.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(Icons.Default.Movie, contentDescription = null, tint = RestLavender, modifier = Modifier.size(38.dp))
        Spacer(Modifier.height(14.dp))
        Text("短片还在准备中", color = RestInk, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(5.dp))
        Text("管理员添加短片系列和集数后，就会显示在这里。", color = RestMuted, fontSize = 13.sp, textAlign = TextAlign.Center)
    }
}

private fun formatRestDuration(seconds: Int?): String? {
    if (seconds == null || seconds <= 0) return null
    return "${seconds / 60}:${(seconds % 60).toString().padStart(2, '0')}"
}
