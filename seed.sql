-- Seed 10 viral YouTube videos
DELETE FROM feed_items WHERE id LIKE 'seed-yt-%';
INSERT INTO feed_items (id, user_id, source, content, collected_at) VALUES
(
  'seed-yt-01', '',
  '{"platform":"youtube","origin_url":"https://www.youtube.com/watch?v=XqZsoesa55w","badge_color":"#FF0000"}',
  '{"author_handle":"@BabyShark","caption":"Baby Shark Dance | Most Viewed Video on YouTube","media_url":"https://i.ytimg.com/vi/XqZsoesa55w/maxresdefault.jpg","is_video":true,"embed_html":"<iframe width=\"100%\" height=\"100%\" src=\"https://www.youtube.com/embed/XqZsoesa55w\" frameborder=\"0\" allowfullscreen></iframe>"}',
  NOW() - INTERVAL '1 minute'
),
(
  'seed-yt-02', '',
  '{"platform":"youtube","origin_url":"https://www.youtube.com/watch?v=kJQP7kiw5Fk","badge_color":"#FF0000"}',
  '{"author_handle":"@LuisFonsiVEVO","caption":"Luis Fonsi - Despacito ft. Daddy Yankee","media_url":"https://i.ytimg.com/vi/kJQP7kiw5Fk/maxresdefault.jpg","is_video":true,"embed_html":"<iframe width=\"100%\" height=\"100%\" src=\"https://www.youtube.com/embed/kJQP7kiw5Fk\" frameborder=\"0\" allowfullscreen></iframe>"}',
  NOW() - INTERVAL '2 minutes'
),
(
  'seed-yt-03', '',
  '{"platform":"youtube","origin_url":"https://www.youtube.com/watch?v=RgKAFK5djSk","badge_color":"#FF0000"}',
  '{"author_handle":"@WizKhalifaVEVO","caption":"Wiz Khalifa - See You Again ft. Charlie Puth","media_url":"https://i.ytimg.com/vi/RgKAFK5djSk/maxresdefault.jpg","is_video":true,"embed_html":"<iframe width=\"100%\" height=\"100%\" src=\"https://www.youtube.com/embed/RgKAFK5djSk\" frameborder=\"0\" allowfullscreen></iframe>"}',
  NOW() - INTERVAL '3 minutes'
),
(
  'seed-yt-04', '',
  '{"platform":"youtube","origin_url":"https://www.youtube.com/watch?v=JGwWNGJdvx8","badge_color":"#FF0000"}',
  '{"author_handle":"@EdSheeran","caption":"Ed Sheeran - Shape of You (Official Music Video)","media_url":"https://i.ytimg.com/vi/JGwWNGJdvx8/maxresdefault.jpg","is_video":true,"embed_html":"<iframe width=\"100%\" height=\"100%\" src=\"https://www.youtube.com/embed/JGwWNGJdvx8\" frameborder=\"0\" allowfullscreen></iframe>"}',
  NOW() - INTERVAL '4 minutes'
),
(
  'seed-yt-05', '',
  '{"platform":"youtube","origin_url":"https://www.youtube.com/watch?v=9bZkp7q19f0","badge_color":"#FF0000"}',
  '{"author_handle":"@officialpsy","caption":"PSY - GANGNAM STYLE","media_url":"https://i.ytimg.com/vi/9bZkp7q19f0/maxresdefault.jpg","is_video":true,"embed_html":"<iframe width=\"100%\" height=\"100%\" src=\"https://www.youtube.com/embed/9bZkp7q19f0\" frameborder=\"0\" allowfullscreen></iframe>"}',
  NOW() - INTERVAL '5 minutes'
),
(
  'seed-yt-06', '',
  '{"platform":"youtube","origin_url":"https://www.youtube.com/watch?v=OPf0YbXqDm0","badge_color":"#FF0000"}',
  '{"author_handle":"@MarkRonsonVEVO","caption":"Mark Ronson - Uptown Funk ft. Bruno Mars","media_url":"https://i.ytimg.com/vi/OPf0YbXqDm0/maxresdefault.jpg","is_video":true,"embed_html":"<iframe width=\"100%\" height=\"100%\" src=\"https://www.youtube.com/embed/OPf0YbXqDm0\" frameborder=\"0\" allowfullscreen></iframe>"}',
  NOW() - INTERVAL '6 minutes'
),
(
  'seed-yt-07', '',
  '{"platform":"youtube","origin_url":"https://www.youtube.com/watch?v=fRh_vgS2dFE","badge_color":"#FF0000"}',
  '{"author_handle":"@JustinBieberVEVO","caption":"Justin Bieber - Sorry (Official Music Video)","media_url":"https://i.ytimg.com/vi/fRh_vgS2dFE/maxresdefault.jpg","is_video":true,"embed_html":"<iframe width=\"100%\" height=\"100%\" src=\"https://www.youtube.com/embed/fRh_vgS2dFE\" frameborder=\"0\" allowfullscreen></iframe>"}',
  NOW() - INTERVAL '7 minutes'
),
(
  'seed-yt-08', '',
  '{"platform":"youtube","origin_url":"https://www.youtube.com/watch?v=4NRXx6U8ABQ","badge_color":"#FF0000"}',
  '{"author_handle":"@TheWeekndVEVO","caption":"The Weeknd - Blinding Lights (Official Music Video)","media_url":"https://i.ytimg.com/vi/4NRXx6U8ABQ/maxresdefault.jpg","is_video":true,"embed_html":"<iframe width=\"100%\" height=\"100%\" src=\"https://www.youtube.com/embed/4NRXx6U8ABQ\" frameborder=\"0\" allowfullscreen></iframe>"}',
  NOW() - INTERVAL '8 minutes'
),
(
  'seed-yt-09', '',
  '{"platform":"youtube","origin_url":"https://www.youtube.com/watch?v=hT_nvWreIhg","badge_color":"#FF0000"}',
  '{"author_handle":"@OneRepublicVEVO","caption":"OneRepublic - Counting Stars (Official Music Video)","media_url":"https://i.ytimg.com/vi/hT_nvWreIhg/maxresdefault.jpg","is_video":true,"embed_html":"<iframe width=\"100%\" height=\"100%\" src=\"https://www.youtube.com/embed/hT_nvWreIhg\" frameborder=\"0\" allowfullscreen></iframe>"}',
  NOW() - INTERVAL '9 minutes'
),
(
  'seed-yt-10', '',
  '{"platform":"youtube","origin_url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","badge_color":"#FF0000"}',
  '{"author_handle":"@RickAstleyYT","caption":"Rick Astley - Never Gonna Give You Up (Official Music Video)","media_url":"https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg","is_video":true,"embed_html":"<iframe width=\"100%\" height=\"100%\" src=\"https://www.youtube.com/embed/dQw4w9WgXcQ\" frameborder=\"0\" allowfullscreen></iframe>"}',
  NOW() - INTERVAL '10 minutes'
)
ON CONFLICT (id) DO NOTHING;
