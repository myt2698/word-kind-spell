CREATE TABLE IF NOT EXISTS `rest_video_series` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(100) NOT NULL,
  `description` text,
  `coverUrl` text NOT NULL,
  `sortOrder` int NOT NULL DEFAULT 0,
  `enabled` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `rest_video_episodes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `seriesId` bigint unsigned NOT NULL,
  `title` varchar(150) NOT NULL,
  `episodeNumber` int NOT NULL,
  `videoUrl` text NOT NULL,
  `durationSeconds` int,
  `enabled` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rest_video_episodes_series_number_unique` (`seriesId`, `episodeNumber`),
  CONSTRAINT `rest_video_episodes_series_fk`
    FOREIGN KEY (`seriesId`) REFERENCES `rest_video_series` (`id`) ON DELETE CASCADE
);
