-- 词音岛数据导入
-- 用户ID = 2（夏）

-- Groups
INSERT INTO word_groups (name, description, sort_order, user_id, textbook_id) VALUES ('Unit 1', '', 0, 2, NULL);
INSERT INTO word_groups (name, description, sort_order, user_id, textbook_id) VALUES ('Unit 1', '', 1, 2, NULL);
INSERT INTO word_groups (name, description, sort_order, user_id, textbook_id) VALUES ('Unit2', '', 1, 2, NULL);
INSERT INTO word_groups (name, description, sort_order, user_id, textbook_id) VALUES ('Unit3', '', 2, 2, NULL);
INSERT INTO word_groups (name, description, sort_order, user_id, textbook_id) VALUES ('Unit 2', '', 2, 2, NULL);
INSERT INTO word_groups (name, description, sort_order, user_id, textbook_id) VALUES ('Unit4', '', 3, 2, NULL);
INSERT INTO word_groups (name, description, sort_order, user_id, textbook_id) VALUES ('Unit 3', '', 3, 2, NULL);
INSERT INTO word_groups (name, description, sort_order, user_id, textbook_id) VALUES ('Unit 4', '', 4, 2, NULL);
INSERT INTO word_groups (name, description, sort_order, user_id, textbook_id) VALUES ('Unit5', '', 5, 2, NULL);
INSERT INTO word_groups (name, description, sort_order, user_id, textbook_id) VALUES ('Unit 5', '', 5, 2, NULL);
INSERT INTO word_groups (name, description, sort_order, user_id, textbook_id) VALUES ('Unit1', '', 6, 2, NULL);
INSERT INTO word_groups (name, description, sort_order, user_id, textbook_id) VALUES ('Unit 6', '', 6, 2, NULL);
INSERT INTO word_groups (name, description, sort_order, user_id, textbook_id) VALUES ('Unit2', '', 7, 2, NULL);
INSERT INTO word_groups (name, description, sort_order, user_id, textbook_id) VALUES ('Unit3', '', 8, 2, NULL);
INSERT INTO word_groups (name, description, sort_order, user_id, textbook_id) VALUES ('Unit4', '', 9, 2, NULL);
INSERT INTO word_groups (name, description, sort_order, user_id, textbook_id) VALUES ('Unit5', '', 10, 2, NULL);
INSERT INTO word_groups (name, description, sort_order, user_id, textbook_id) VALUES ('Unit6', '', 11, 2, NULL);

-- Tags
INSERT INTO tags (name, user_id) VALUES ('qu', 2);
INSERT INTO tags (name, user_id) VALUES ('or 在非重读音节/ər/', 2);
INSERT INTO tags (name, user_id) VALUES ('ar/ɑː/', 2);
INSERT INTO tags (name, user_id) VALUES ('er', 2);
INSERT INTO tags (name, user_id) VALUES ('ur', 2);
INSERT INTO tags (name, user_id) VALUES ('辅+y多音节', 2);
INSERT INTO tags (name, user_id) VALUES ('辅音+y 单音节 /aɪ/', 2);
INSERT INTO tags (name, user_id) VALUES ('ire', 2);
INSERT INTO tags (name, user_id) VALUES ('ore', 2);
INSERT INTO tags (name, user_id) VALUES ('oo', 2);
INSERT INTO tags (name, user_id) VALUES ('ea/iː/', 2);
INSERT INTO tags (name, user_id) VALUES ('ee', 2);
INSERT INTO tags (name, user_id) VALUES ('oor', 2);
INSERT INTO tags (name, user_id) VALUES ('ple', 2);
INSERT INTO tags (name, user_id) VALUES ('i+ld/nd', 2);
INSERT INTO tags (name, user_id) VALUES ('str', 2);
INSERT INTO tags (name, user_id) VALUES ('air', 2);
INSERT INTO tags (name, user_id) VALUES ('al', 2);
INSERT INTO tags (name, user_id) VALUES ('ese', 2);
INSERT INTO tags (name, user_id) VALUES ('pl', 2);
INSERT INTO tags (name, user_id) VALUES ('ay', 2);
INSERT INTO tags (name, user_id) VALUES ('oot/ood/ook', 2);
INSERT INTO tags (name, user_id) VALUES ('all', 2);
INSERT INTO tags (name, user_id) VALUES ('ou/aʊ/', 2);
INSERT INTO tags (name, user_id) VALUES ('oi', 2);
INSERT INTO tags (name, user_id) VALUES ('双写辅音，保护短元音', 2);
INSERT INTO tags (name, user_id) VALUES ('igh', 2);
INSERT INTO tags (name, user_id) VALUES ('wh', 2);
INSERT INTO tags (name, user_id) VALUES ('dr', 2);
INSERT INTO tags (name, user_id) VALUES ('wor', 2);
INSERT INTO tags (name, user_id) VALUES ('ice在多音节词', 2);
INSERT INTO tags (name, user_id) VALUES ('ow/aʊ/', 2);
INSERT INTO tags (name, user_id) VALUES ('ow/əʊ/', 2);
INSERT INTO tags (name, user_id) VALUES ('old', 2);
INSERT INTO tags (name, user_id) VALUES ('ea/e/', 2);
INSERT INTO tags (name, user_id) VALUES ('ai', 2);
INSERT INTO tags (name, user_id) VALUES ('or/ɔː/', 2);
INSERT INTO tags (name, user_id) VALUES ('ph', 2);
INSERT INTO tags (name, user_id) VALUES ('ear /ɪə/', 2);
INSERT INTO tags (name, user_id) VALUES ('and', 2);
INSERT INTO tags (name, user_id) VALUES ('are /eə/', 2);
INSERT INTO tags (name, user_id) VALUES ('ile', 2);
INSERT INTO tags (name, user_id) VALUES ('oy /ɔɪ/', 2);
INSERT INTO tags (name, user_id) VALUES ('ir /ɜː/', 2);
INSERT INTO tags (name, user_id) VALUES ('ass/ɑː/', 2);
INSERT INTO tags (name, user_id) VALUES ('ew/juː/', 2);
INSERT INTO tags (name, user_id) VALUES ('our/ə/', 2);
INSERT INTO tags (name, user_id) VALUES ('ear /eə/', 2);
INSERT INTO tags (name, user_id) VALUES ('aw/ɔː/', 2);
INSERT INTO tags (name, user_id) VALUES ('our /ɔː/', 2);
INSERT INTO tags (name, user_id) VALUES ('gh不发音', 2);
INSERT INTO tags (name, user_id) VALUES ('wh /h/', 2);
INSERT INTO tags (name, user_id) VALUES ('ong/ɒŋ/', 2);
INSERT INTO tags (name, user_id) VALUES ('ture/tʃə/', 2);
INSERT INTO tags (name, user_id) VALUES ('ing/ɪŋ/', 2);
INSERT INTO tags (name, user_id) VALUES ('ou/u:/', 2);
INSERT INTO tags (name, user_id) VALUES ('ui/u:/', 2);

-- Words
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('cool', '/kuːl/', ' 凉爽的，酷的', 'Look at its legs. Cool! 
This boat is cool.
', '', 'new', 'idle', 2, NULL),
('like', '/laɪk/', '喜欢', 'I like your dog.', '', 'new', 'idle', 2, NULL),
('dog', '/dɒɡ/ ', '狗', 'I like your dog.
', '', 'new', 'idle', 2, NULL),
('pet', ' /pet/', '宠物', 'Do you have a pet? No, I don''t.
', '', 'new', 'idle', 2, NULL),
('cat', '/kæt/', '猫', ' Do you have a pet? 
Yes, I do. I have a cat. ', '', 'new', 'idle', 2, NULL),
('fish', ' /fɪʃ/', '鱼', 'I like fish. 
Swim, swim, swim like a fish.
', '', 'new', 'idle', 2, NULL),
('bird', ' /bɜːd/', '鸟', 'I like birds.
Sing, sing, sing like a bird.
', '', 'new', 'idle', 2, NULL),
('go', ' /ɡəʊ/ ', ' 去；走', 'Let''s go to the zoo. Great!
', '', 'new', 'idle', 2, NULL),
('zoo', '/zuː/', '动物园', 'Let''s go to the zoo!', '', 'new', 'idle', 2, NULL),
('fox', '/fɒks/', '狐狸', 'Look! What''s this? It''s a fox.
', '', 'new', 'idle', 2, NULL),
('Miss', '/mɪs/', '（学生对女教师的称呼）老师；女士', 'Miss White, what''s that?', '', 'new', 'idle', 2, NULL),
('panda', '/ˈpændə/', '熊猫', 'It''s a panda.', '', 'new', 'idle', 2, NULL),
('red panda', ' /red/  /ˈpændə/ ', '小熊猫 ', 'It''s a red panda.', '', 'new', 'idle', 2, NULL),
('cute', '/kjuːt/', '可爱的', 'It''s cute!
', '', 'new', 'idle', 2, NULL),
('monkey', '/ˈmʌŋki/', '猴子', ' It''s a monkey.  
', '', 'new', 'idle', 2, NULL),
('tiger', '/ˈtaɪɡə/', '老虎', 'It''s a tiger.
', '', 'new', 'idle', 2, NULL),
('elephant', ' /ˈelɪfənt/', '大象', 'It''s an elephant. 
', '', 'new', 'idle', 2, NULL),
('lion', '/ˈlaɪən/', '狮子', 'It''s a lion. 
', '', 'new', 'idle', 2, NULL),
('animal', ' /ˈænɪml/', '动物', 'Amazing animals
', '', 'new', 'idle', 2, NULL),
('giraffe', '/dʒəˈrɑːf/', '长颈鹿', 'The giraffe is tall! 
', '', 'new', 'idle', 2, NULL);
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('fast', '/fɑːst/', '快', 'The lion is fast!
', '', 'new', 'idle', 2, NULL),
('your', '/ jɔː(r); jə(r) /', '你的', 'What''s your name?', '', 'new', 'idle', 2, NULL),
('tall', '/tɔːl/', '高', 'The giraffe is tall! 
', '', 'new', 'idle', 2, NULL),
('rabbit', ' /ˈræbɪt/', '兔子', 'I like rabbits. 
Hop, hop, hop like a rabbit.

Eagles can see a rabbit from the sky. We can''t. 
But we can use tools to see more!', '', 'new', 'idle', 2, NULL),
('long', '/lɒŋ/', '（长度或距离）长的', 'Your dog is cute. It has a long body and short legs.', '', 'new', 'idle', 2, NULL),
('thirteen', '/ˌθɜːˈtiːn/', '13', 'Six and seven makes thirteen.
', '', 'new', 'idle', 2, NULL),
('fourteen', ' /ˌfɔːˈtiːn/', '14', 'How many apples do we need? We need fourteen.
', '', 'new', 'idle', 2, NULL),
('twelve', '/twelv/', '十二个', 'How many pencils do we have? Twelve', '', 'new', 'idle', 2, NULL),
('fifteen', '/ˌfɪfˈtiːn/', '15', 'How many books do we have? 
We have fifteen books.', '', 'new', 'idle', 2, NULL),
('home', '/(h)əʊm/', '家；住所', 'Do you have old things at home?
Yes, I do. I have many old toys and books.

Find some old things at home.', '', 'new', 'idle', 2, NULL),
('put', '/pʊt/', '把', 'I have many old books. They are still good. I put them in a box.', 'u 发 /ʊ/：在自然拼读中，u 在闭音节中通常发 /ʌ/，但在 put, push, pull, full, bull 这几个词中是特例，发 /ʊ/', 'new', 'idle', 2, NULL),
('still', '/stɪl/', '还是；仍然', 'I have some old dolls and animal toys. They are still nice. I put them in a box.', '', 'new', 'idle', 2, NULL),
('car', '/kɑː/', 'n. 小汽车，轿车，（火车）车厢', 'I have a car. 

I have some old cars and boats. 
They are still good. I put them on the shelves.', '', 'new', 'idle', 2, NULL),
('talk', '/tɔːk/', '（用某种语言）讲，说；说话', 'We talk. Our mouth, face and body can all "talk".

Down, down, down. Sit down and talk. 
', '', 'new', 'idle', 2, NULL),
('box', '/bɒks/', '盒子', 'It''s in the box. 
Up, up, up. Put your old things in a box.
', '', 'new', 'idle', 2, NULL),
('boat', '/bəʊt/', '船', 'I have a boat.
Down, down, down. Put your boat under the bed.
', '', 'new', 'idle', 2, NULL),
('shelf', ' /ʃelf/ ', '架子上', 'Is it on the shelf? No, it isn''t.

Up, up, up. Put your old dolls on the shelf.
', '', 'new', 'idle', 2, NULL),
('under', ' /ˈʌndə(r)/', '下', 'Down, down, down. Put your books under the ball.
', '', 'new', 'idle', 2, NULL),
('map', '/mæp/', '地图', 'Up, up, up. Put your old map on the wall.
', '', 'new', 'idle', 2, NULL),
('cap', '/kæp/', '帽', 'Where is my map? It''s under the box.

', '', 'new', 'idle', 2, NULL);
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('in', '/ɪn/', '在……内；在……中', 'Aha! It''s in the box. And this old cap too.', '', 'new', 'idle', 2, NULL),
('on', '/ɒn/', '（覆盖、附着）在……上 ', 'Mum, where is my animal book?
Is it on the shelf?
', '', 'new', 'idle', 2, NULL),
('doll', '/dɒl/', '娃娃', 'I have a doll. 
', '', 'new', 'idle', 2, NULL),
('ball', '/bɔːl/', 'n. 球（状物），舞会
v. 做成球状', 'I have a ball. 
One cute cat uses two old balls.
', '', 'new', 'idle', 2, NULL),
('keep', '/kiːp/', '保有；留着', 'You can keep it.', '', 'new', 'idle', 2, NULL),
('at', '/æt/ ', '在（某处）', 'Do you have old things at home?', '闭音节规则：在自然拼读中，当元音字母（a, e, i, o, u）后面跟着一个或多个辅音字母时，它通常发短元音。at 就是最典型的“元音+辅音”（VC）结构。', 'new', 'idle', 2, NULL),
('yummy', '/ˈjʌmi/ ', '美味的', 'Share the cake. Yummy!

Candy and cake are yummy, but 
don''t eat too much!

I eat from flowers. They''re 
yummy and healthy too.', '', 'new', 'idle', 2, NULL),
('colourful', '/ˈkʌləfl/ ', '丰富多彩的', 'Fruit and vegetables are colourful 
and healthy. Eat some every day! ', 'ful：这是核心后缀规律！后缀 -ful 在单词结尾时，通常弱读为 /fəl/（发音像轻声的“佛”）', 'new', 'idle', 2, NULL),
('candy', '/ˈkændi/', '糖果', 'Candy and cake are yummy, but don''t eat too much', '', 'new', 'idle', 2, NULL),
('bruise ', '/bruːz/', '瘀伤', 'Bananas bruise easily.
I bruise easily.', '', 'new', 'idle', 2, NULL),
('juice', ' /dʒuːs/', '果汁', 'Drink your juice. Drink, drink, drink!
', '', 'new', 'idle', 2, NULL),
('fruit', '/fruːt/', '水果', 'We are healthy. What do we need?
Vegetables, rice, meat and fruit.', '', 'new', 'idle', 2, NULL),
('group', '/ɡruːp/', '集团', 'A group of people gathered in front of the Parliament to demonstrate against the Prime Minister''s proposals.
Did you see the new jazz group?', '', 'new', 'idle', 2, NULL),
('soup', '/suːp/', '汤', 'We are healthy. What do we need?
Water, soup, milk and juice', '', 'new', 'idle', 2, NULL),
('plate', '/pleɪt/', '盘子', 'Your plate is not healthy, John.
Have some vegetables and fruit, John.', '', 'new', 'idle', 2, NULL),
('healthy', '/ˈhelθi/ ', '健康的', 'This is my healthy plate.
We are healthy. What do we need?
Water, soup, milk and juice.
We are healthy. What do we need?
Vegetables, rice, meat and fruit.', '', 'new', 'idle', 2, NULL),
('vegetable', ' /ˈvedʒtəbl/', '蔬菜', 'Have some vegetables too. 
They''re good.', '', 'new', 'idle', 2, NULL),
('meat', ' /miːt/', '肉', 'Would you like some rice and meat? Yes, please.
', '', 'new', 'idle', 2, NULL),
('rice', '/raɪs/', '大米', 'Would you like some rice and meat? Yes, please.
', '', 'new', 'idle', 2, NULL),
('noodle', '/nuːdl̩/', '（常用复数）面条 ', 'I''d like some juice and noodles.', '', 'new', 'idle', 2, NULL);
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('milk', '/mɪlk/', '牛奶', 'Here you are.
Have some milk too', '', 'new', 'idle', 2, NULL),
('egg', '/eɡ/ ', '蛋; 鸡蛋 ', 'OK, Mum. I''d like some bread and eggs, please', '', 'new', 'idle', 2, NULL),
('dead', '/ ded /', 'adj. 死的，死气沉沉的，用尽的，没电的，完全的，已停滞的
adv. 完全地，非常，正好
n. 死（者）', 'Have respect for the dead.
The dead of night. The dead of winter.', '', 'new', 'idle', 2, NULL),
('breakfast', ' /ˈbrekfəst/', '早餐', 'Breakfast time!
', '前面的 ea 组合发短促的‘哎’音 /e/，后面的 fast 读得轻一点，发 /fəst/，连起来就是 break-fast', 'new', 'idle', 2, NULL),
('bread', '/breːd/', '面包', 'OK, Mum. I''d like some bread and eggs, please.', '', 'new', 'idle', 2, NULL),
('time', ' /taɪm/', '时间', 'Breakfast time!
', '', 'new', 'idle', 2, NULL),
('draw', '/drɔː/', 'v. 画', 'Let''s draw some purple and brown birds.

We draw maps with pencils and paper. Bees can''t draw. But they can make a "map"', '', 'new', 'idle', 2, NULL),
('learn', '/lɜːn/ ', '学习', 'I can use paper, pencils, books and computers to learn.

We learn from Mum and Dad. Polar bears do the same.
We play and learn. Lions do the same.

We speak and learn. Ants can''t speak. But they 
can use smell to learn
', '', 'new', 'idle', 2, NULL),
('tongue', '/tʌŋ/', '舌头', 'I taste with my tongue.
We taste food with our tongues. Frogs get food with their tongues.', '中间的 o 发短促的 /ʌ/，最后的 ng 发鼻音 /ŋ/，而 ue 是藏起来不发音的，连起来就是 t-ong-ue。', 'new', 'idle', 2, NULL),
('love', '/lʌv/', '喜爱；爱', 'His tail is long.
His legs are short.
But I love him, don''t you know?
I love my school!
', '', 'new', 'idle', 2, NULL),
('song', '/sɒŋ/', '首歌', 'We sing songs or dance.
I hear songs.
', '', 'new', 'idle', 2, NULL),
('teacher', '/ˈtiːtʃə(r)/ ', 'n. 教师', 'Miss White is my English teacher.
She is very nice.
I see teachers and students.', '', 'new', 'idle', 2, NULL),
('computer', '/kəmˈpjuːtə(r)/', '电脑', 'I can use paper, pencils, 
books and computers to 
learn. ', '', 'new', 'idle', 2, NULL),
('in class', '/ɪn/', '在课堂上 ', 'I see and hear in class. 
', '', 'new', 'idle', 2, NULL),
('class', ' /klɑːs/', '课；班级', 'I see and hear in class. 
', '', 'new', 'idle', 2, NULL),
('nose', '/nəʊz/', '鼻子', 'I smell with my nose. 
', '', 'new', 'idle', 2, NULL),
('touch', ' /tʌtʃ/', '触摸；碰 ', 'See some fruit,
Touch and feel.
Taste an apple,
Hear the sound.
Take an orange,
Smell the peel', 'ou：这是核心特例！字母组合 ou 在这里发短元音 /ʌ/。
类似的有 young，double', 'new', 'idle', 2, NULL),
('taste', '/teɪst/', '尝（味道）', 'I taste with my tongue.
', '这是核心！字母 a 后面跟着两个辅音 st 和不发音的 e。在这种结构里，a 发它的字母本音，也就是长元音 /eɪ/。', 'new', 'idle', 2, NULL),
('smell', '/smel/', '闻（气味） ', 'I smell with my nose. 
', '', 'new', 'idle', 2, NULL),
('see', '/siː/', '看见 ', 'I see and hear in class. 
', '', 'new', 'idle', 2, NULL);
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('these', '/ðiːz/', '这些 ', ' What are these? 
They''re grapes.
', '', 'new', 'idle', 2, NULL),
('ruler', '/ˈruːlə(r)/', '直尺', 'Draw a line with your ruler.
', '', 'new', 'idle', 2, NULL),
('paper', '/ˈpeɪpə/', '纸', 'Write on your paper.
', '', 'new', 'idle', 2, NULL),
('bag', '/ˈbæːɡ/', '包；袋 ', 'Put everything in your bag.
', '', 'new', 'idle', 2, NULL),
('book', '/buːk/', '书；书籍 ', 'Read your book.
', '', 'new', 'idle', 2, NULL),
('pencil', '/ˈpensl/', '铅笔', 'Write with your pencil.
Put the pen in your pencil box.
', '', 'new', 'idle', 2, NULL),
('pen', ' /pen/', '笔', 'Put the pen in your pencil box.
', '', 'new', 'idle', 2, NULL),
('find', '/faɪnd/', '找到；找回', 'I can''t find my ruler. Can I use your ruler, Zhang Peng?', '', 'new', 'idle', 2, NULL),
('eraser', ' /ɪˈreɪzə(r)/ ', '橡皮擦', 'Excuse me. Can I use your eraser, please?', '', 'new', 'idle', 2, NULL),
('much', '/mʌtʃ/ ', '许多；大量 ', ' Smile! A smile can say so much', '', 'new', 'idle', 2, NULL),
('or', '/ɔː(r)/', '或；或者；还是 ', ' We sing songs or dance.', '', 'new', 'idle', 2, NULL),
('so', '/səʊ/', '（表示大小或数量）这么，那么', 'Smile! A smile can say so much!', '', 'new', 'idle', 2, NULL),
('call', '/ kɔːl /', '
n. 打电话', 'I received several calls today.
I paid a call to a dear friend of mine.', '', 'new', 'idle', 2, NULL),
('all', '/ɔːl/', '所有', 'We talk. Our mouth, face and body can all "talk". 
', '', 'new', 'idle', 2, NULL),
('dance', ' /dɑːns/', '跳舞', 'Dance together', '', 'new', 'idle', 2, NULL),
('face', '/feɪs/', '脸', ' We talk. Our mouth, face and body can all "talk". 
', '', 'new', 'idle', 2, NULL),
('bring ', '/ˈbrɪŋ/', '带来', 'Waiter, please bring me a single malt whiskey.
The new company director brought a fresh perspective on sales and marketing.', '', 'new', 'idle', 2, NULL),
('wing', '/wɪŋ/', '翅膀', 'to take wing
the west wing of the hospital', '', 'new', 'idle', 2, NULL),
('king', '/kɪŋ/', '国王', 'Henry VIII was the king of England from 1509 to 1547.
Howard Stern styled himself as the "king of all media".', '', 'new', 'idle', 2, NULL),
('sing', '/sɪŋ/', '唱（歌）；演唱', 'Let''s sing and dance.
', '', 'new', 'idle', 2, NULL);
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('adventure', '/ ədˈventʃə(r) /', '冒险', 'A life full of adventures.
his sense of adventure', '', 'new', 'idle', 2, NULL),
('culture', '/ ˈkʌltʃə(r) /', '文化', 'I''m headed to the lab to make sure my cell culture hasn''t died.', '', 'new', 'idle', 2, NULL),
('future', '/ ˈfjuːtʃə(r) /', '未来', 'There is no future in dwelling on the past.
Future generations will either laugh or cry at our stupidity.', '', 'new', 'idle', 2, NULL),
('card', '/kaːd/', '贺卡；慰问卡； 卡片', 'Let''s make a card.
', '', 'new', 'idle', 2, NULL),
('picture', '/ˈpɪktʃə/', '图片； 图画', 'draw a picture
', '', 'new', 'idle', 2, NULL),
('gift', '/ɡɪft/', '礼物', ' I often make her gifts.', '', 'new', 'idle', 2, NULL),
('her', '/hɜː(r)', '她的', 'Do you often say that to your mum?
Yes, I do. What about you?
No, I don''t. I often make her gifts.', '', 'new', 'idle', 2, NULL),
('tail', '/teɪl/', '尾巴', 'I love my rabbit. It has long ears and a short tail.', '', 'new', 'idle', 2, NULL),
('slow', '/sləʊ/', '慢', 'I have a cat.
He''s old and fat,
And he''s also very slow', '', 'new', 'idle', 2, NULL),
('thin', '/ˈθɪn/', '瘦的 ', 'Do you have a pet?
Yes, I have a dog. It''s thin. 
It has a long body. I like it.', '', 'new', 'idle', 2, NULL),
('fat', '/fæt/', ' 肥的；肥胖的', 'I have a cat.
He''s old and fat,
And he''s also very slow.', '', 'new', 'idle', 2, NULL),
('right', '/ˈraɪt/', '正确的', 'Your dog is cute. It has a long body and short legs.
Yes, that''s right.', '', 'new', 'idle', 2, NULL),
('leg', ' /leɡ/', '腿', 'His legs are short.
', '', 'new', 'idle', 2, NULL),
('corn', '/ kɔːn /', '玉米', 'He paid her the nominal fee of two corns of barley.
to corn gunpowder', '', 'new', 'idle', 2, NULL),
('story', '/ ˈstɔːri /', '故事', 'The book tells the story of two roommates.
You’ve been telling stories again, haven’t you?', '在自然拼读（Phonics）的教学中，有一个非常实用的口诀：“有 r 就有 /r/”。
虽然单词里只写了一个字母 r，但在发音时，它其实身兼两职：
它和前面的元音字母组合（比如 o），一起发长元音 /ɔː/。
它自己还要独立发出 /r/ 的卷舌音。', 'new', 'idle', 2, NULL),
('short', ' /ʃɔːt/', '短的', 'I love my rabbit. It haslong ears and a short tail.', '', 'new', 'idle', 2, NULL),
('body', '/ˈbɒdi/', '身体', 'Your dog is cute. It has a 
long body and short legs.', '', 'new', 'idle', 2, NULL),
('among', '/əˈmɒŋ/', '在', 'How can you speak with authority about their customs when you have never lived among them?
He is among the few who completely understand the subject.', '', 'new', 'idle', 2, NULL),
('wrong', '/rɒŋ/', '错误的', 'Injustice is a heinous wrong.
Some of your answers were correct, and some were wrong.', '', 'new', 'idle', 2, NULL),
('strong', '/ strɒŋ /', '强大的', 'a big strong man; Jake was tall and strong
a strong foundation; good strong shoes', '', 'new', 'idle', 2, NULL);
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('make', '/meɪk/', '使出现；做 ', 'Wow! Blue and yellow make green.
I can make a cake.', '', 'new', 'idle', 2, NULL),
('has', ' /hæz/', '（have的第三人称单数形式）具有（某种外表、特性或特征）', 'Your dog is cute. It has a long body and short legs.', '', 'new', 'idle', 2, NULL),
('USA', ' /ˌjuː es ˈeɪ/ ', '美国', 'Students from Canada and the USA.
We are friends. We like to play.', '', 'new', 'idle', 2, NULL),
('Canada', ' /ˈkænədə/', '加拿大', 'Students from Canada and the USA.
', '', 'new', 'idle', 2, NULL),
('UK', ' /ˌjuː ˈkeɪ/', '英国', 'Hi! I''m Amy.
I''m from the UK.', '', 'new', 'idle', 2, NULL),
('China', '/tʃʌɪnə/', '中国', 'I''m from Henan, China. 
My name is Linlin. ', '', 'new', 'idle', 2, NULL),
('very', ' /ˈveri/', '非常', 'Miss White is my English teacher.
She is very nice.', '', 'new', 'idle', 2, NULL),
('she', '/ʃiː/', '她', 'Miss White is my English teacher.
She is very nice.', '', 'new', 'idle', 2, NULL),
('English', '/ˈɪŋ.ɡlɪʃ/', '英语', 'Miss White is my English teacher.
She is very nice.', '', 'new', 'idle', 2, NULL),
('he', ' /hiː/', '他', 'Zhang Peng is my classmate.
He is my neighbour too.', '', 'new', 'idle', 2, NULL),
('classmate', ' /ˈklɑːsmeɪt/', '同学', 'Mike is my classmate. He is from Canada.', '', 'new', 'idle', 2, NULL),
('Mr', '/ˈmɪstə(r)/', '先生', 'That''s my new neighbour, Mr Lin.', '', 'new', 'idle', 2, NULL),
('man', ' /mæn/', '男人。', 'The man is my neighbour.', '', 'new', 'idle', 2, NULL),
('woman', '/ˈwʊmən/', '成年女子；妇女', 'The woman is my neighbour.', '', 'new', 'idle', 2, NULL),
('boy', ' /bɔɪ/', '男孩', 'The boy is my neighbour. ', '', 'new', 'idle', 2, NULL),
('neighbour', '/ˈneɪbə/', '邻居', 'That''s our new neighbour, Amy.', '', 'new', 'idle', 2, NULL),
('girl', '/ɡɜːl/ ', '女孩', 'Who''s that girl?
The girl is my neighbour.', '', 'new', 'idle', 2, NULL),
('whole', '/həʊl/', '整个', 'This variety of fascinating details didn''t fall together into an enjoyable, coherent whole.
I ate a whole fish.', '', 'new', 'idle', 2, NULL),
('whose', '/huːz/', '谁的', '', '', 'new', 'idle', 2, NULL),
('who', '/huː/', '谁；什么人', 'Who''s that girl? That''s our new neighbour, Amy.
', '', 'new', 'idle', 2, NULL);
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('after', '/ˈɑːftə(r)/', '在……后面 ', 'After you.
', '', 'new', 'idle', 2, NULL),
('student', ' /ˈstjuːdnt/ ', '学生', 'He is a student of life.', '', 'new', 'idle', 2, NULL),
('today', '/təˈdeɪ/', '今天', 'We have two new friends today.
', '', 'new', 'idle', 2, NULL),
('about', ' /əˈbaʊt/ ', '关于', 'What about you?', '', 'new', 'idle', 2, NULL),
('from', '/frɒm/', '（表示来源）来自，从……来 ', 'I''m from Shandong, China.', '', 'new', 'idle', 2, NULL),
('where', '/weə(r)/', ' 在哪里；到哪里', 'Where are you from?
I''m from the UK. What about you?', '', 'new', 'idle', 2, NULL),
('cake', '/keɪk/', '蛋糕', 'Dogs don''t eat cake, Sam! ', '', 'new', 'idle', 2, NULL),
('eat', '/iːt/', '吃', 'Dogs don''t eat cake, Sam! 
Three cuts. Let''s eat!
', '', 'new', 'idle', 2, NULL),
('cut', '/kʌt/', '减少', 'Happy birthday! Three cuts. Let''s eat!
Oh, one more cut for the dog. Dogs don''t eat cake, Sam! 
', '', 'new', 'idle', 2, NULL),
('o''clock', '/əˈklɒk/', '点', 'It''s seven o''clock. Hurry! 
', '', 'new', 'idle', 2, NULL),
('nine', '/naɪn/', '九个', 'Nine grapes.', '', 'new', 'idle', 2, NULL),
('weight', '/weɪt/', '重量', 'He''s working out with weights.
the weight of care or business', '', 'new', 'idle', 2, NULL),
('eight', '/eɪt/', '八个', 'One head, eight eyes, eight legs.
I am a spider.', '', 'new', 'idle', 2, NULL),
('seven', '/ˈsevn/ ', '七个', 'It''s seven o''clock. Hurry! 
', '', 'new', 'idle', 2, NULL),
('six', '/sɪks/', '六个', 'I have six yuan.
', '', 'new', 'idle', 2, NULL),
('ten', '/ten/', '十个', 'I have ten yuan.   
', '', 'new', 'idle', 2, NULL),
('four', '/fɔː(r)/', '四个', 'Four and five! Four and five!
', '', 'new', 'idle', 2, NULL),
('three', '/θriː/', '三个', 'Jump! Jump! Jump! Three, two, one!
', '', 'new', 'idle', 2, NULL),
('two', '/tuː/', 'Jump! Jump! Jump! Three, two, one!
', 'Jump! Jump! Jump! Three, two, one!
', 'w：这也是不发音的！字母 w 在这里同样不发音。
', 'new', 'idle', 2, NULL),
('one', '/wʌn/', '一个', 'Jump! Jump! Jump! One, two, three!
', 'one 属于自然拼读中必须死记硬背的“视觉词', 'new', 'idle', 2, NULL);
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('year', '/jɪə/', '一年', 'I''m five years old.
', '', 'new', 'idle', 2, NULL),
('five', ' /faɪv/', '五个', 'I''m five years old.
', '', 'new', 'idle', 2, NULL),
('cold', '/ kəʊld /', 'adj. （寒）冷的，冷酷的，冷色调的，真实的
n. （寒）冷，感冒
adv. 突然，毫无准备地', 'A cold wind whistled through the trees.
The forecast is that it will be very cold today.', '', 'new', 'idle', 2, NULL),
('gold', '/ ɡəʊld /', 'n. 金，黄金，金色，金币，金饰品
adj. 金（制）的，含金的，金色的，金本位的', 'France has won three golds and five silvers.', '', 'new', 'idle', 2, NULL),
('hold', '/ həʊld /', 'v. 拿着，按住，保持…，支撑重量，容纳，拘留，控制，吸引住，把…固定住，储备，拥有，担任，赢得，持有，认为，举行，平稳行驶，继续唱，不挂断，停止，保卫
n. 握，持，控制，支撑点', 'Keep a firm hold on the handlebars.
Can I have a hold of the baby?', '', 'new', 'idle', 2, NULL),
('old', ' /əʊld/', 'adj. （多少）岁，年纪大的，陈旧的', 'How old are you? I''m five years old.

', '', 'new', 'idle', 2, NULL),
('black', ' /blæk/', '黑色的', 'Black, black, sit down.
White, white, turn around.
Pink and red, touch the ground.
Orange and red, jump up and down.', '', 'new', 'idle', 2, NULL),
('what', '/wɔt/', '什么', 'What''s your name?', '', 'new', 'idle', 2, NULL),
('white', '/waɪt/', '白色', 'Black, black, sit down.
White, white, turn around.
Pink and red, touch the ground.
Orange and red, jump up and down', '', 'new', 'idle', 2, NULL),
('straw', '/strɔː/', '稻草', 'straw hat
A straw enemy built up in the media to seem like a real threat, which then collapses like a balloon.', '', 'new', 'idle', 2, NULL),
('pink', '/pɪŋk/', '粉红色的', 'What colours do you like? I like red and pink.
OK. Let''s draw some red and pink flowers.

', '', 'new', 'idle', 2, NULL),
('sea', '/siː/', 'n. 海（洋），海面情况，大量', 'blue sea', '', 'new', 'idle', 2, NULL),
('duck', '/dʌk/', '鸭', 'a yellow duck
', '', 'new', 'idle', 2, NULL),
('yellow', '/ ˈjeləʊ /', '黄色的', 'a yellow duck
', '', 'new', 'idle', 2, NULL),
('swear', '/ sweə(r) /', '发誓', '', '', 'new', 'idle', 2, NULL),
('pear', '/ peə(r) /', '梨', '', '', 'new', 'idle', 2, NULL),
('wear', '/ weə(r) /', '穿（衣服），戴（首饰等）；', '', '', 'new', 'idle', 2, NULL),
('bear', ' /beə(r)/', '熊', 'a brown bear', '', 'new', 'idle', 2, NULL),
('how', '/ haʊ /', 'adv. 怎样，健康状况如何，到何种地步，以任何方式', 'I am not interested in the why, but in the how.
How often do you practice?', '', 'new', 'idle', 2, NULL),
('brown', '/braʊn/', '棕色（的）', 'I see colours here and there.
A big brown bear. What else can you see? ', '', 'new', 'idle', 2, NULL);
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('purple', '/ˈpɜːpl/ ', 'adj. 紫色的，帝王的，词藻华美的
n. 紫色，紫（红）衣，紫袍，帝位，皇权，皇族
vt. 使成紫色
vi. 变紫', ' a purple flower.
Purple flowers, green grass and blue sea.
', '', 'new', 'idle', 2, NULL),
('blue', '/bluː/', '蓝色的', 'Look! Red and blue make purple. ', 'ue组合发/uː/', 'new', 'idle', 2, NULL),
('red', '/red/ ', '红色的', 'Look! Red and blue make purple. ', '', 'new', 'idle', 2, NULL),
('green', '/ɡriːn/', '绿色', 'What colour is it? It''s green.

Wow! Blue and yellow make green.
', '', 'new', 'idle', 2, NULL),
('orange', ' /ˈɒrɪndʒ/', ' 橙子；柑橘 ; 橙红色；橙红色的', 'Grapes are small. Bananas are long.
Apples and oranges make you strong.

What colour is it? It''s orange.

', '', 'new', 'idle', 2, NULL),
('humour ', '/ ˈhjuːmə(r) /', '幽默', 'She has a great sense of humour, and I always laugh a lot whenever we get together.
He was in a particularly vile humour that afternoon.', '', 'new', 'idle', 2, NULL),
('flavour ', '/ ˈfleɪvə(r) /', '味道', 'The flavor of this apple pie is delicious.
Flavor was added to the pudding.', '', 'new', 'idle', 2, NULL),
('favour', '/ˈfeɪ.və/', '支持，喜爱', 'He did me a favor when he took the time to drive me home.
She enjoyed the queen''s favor.', '', 'new', 'idle', 2, NULL),
('colour', ' /ˈkʌlə(r)/', '颜色', 'What colour is it? It''s green.

', '', 'new', 'idle', 2, NULL),
('them', '/ðəm, ðem/', '它们；他们；她们 
', 'Apple trees need air, water and sun. We can help them. They can give us apples.

Now I am a big yellow flower. Bees come. They are yellow and black. I give them food.
', '', 'new', 'idle', 2, NULL),
('us', ' /ʌs/', '我们', 'Trees grow and give us things: Fresh air, flowers and leaves in spring. 

Apple trees need air, water and sun. We can help them. They can give us apples.', '', 'new', 'idle', 2, NULL),
('give', '/ɡɪv/', '给', 'Trees grow and give us things:
Fresh air, flowers and leaves in spring.  

Plants can give us many things. We need plants, and we can help them too.', '在自然拼读中，give、live、have、love 这几个高频词是典型的“魔法 e 失效”案例，需要作为特例单独记忆', 'new', 'idle', 2, NULL),
('sun', '/sʌn/', '太阳', 'Plants need air, water and sun. 
', '', 'new', 'idle', 2, NULL),
('tree', '/ triː /', 'n. 树，木料，树状图，宗谱', 'We can plant new trees.', '', 'new', 'idle', 2, NULL),
('new', '/njuː/', '新', 'Zoom is my new friend. 
', '字母组合 ew 在这里发长元音 /juː/', 'new', 'idle', 2, NULL),
('plant', '英/plɑːnt/ 美/ plænt /', '植物', 'Air, water and sun.
These can all help plants grow.
Plant, water, cut and turn. 
These are some things I know.
Plants need air, water and sun. They help plants grow. 
Plants can give us many things. We need plants, and we can help them too.', '', 'new', 'idle', 2, NULL),
('glass', '/ɡlɑːs/', '玻璃', 'to fibreglass the hull of a fishing-boat
A popular myth is that window glass is actually an extremely viscous liquid.', '', 'new', 'idle', 2, NULL),
('grass', ' /ɡrɑːs/ ', '草', 'We can water the grass. ', '', 'new', 'idle', 2, NULL),
('water', '/ˈwoːtə/', 'n. 水，水域，领海，困境
v. 灌溉，流泪，流口水，给', 'Plants need air, water and sun. 
We can water the flowers.
We can water the grass. ', '', 'new', 'idle', 2, NULL),
('need', '/niːd/', '需要', 'The school gardens need help. 
Plants need air, water and sun. 
', '', 'new', 'idle', 2, NULL);
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('garden', ' /ˈɡɑːdn/', '花园', 'The school gardens need help.
We can water the grass.', '', 'new', 'idle', 2, NULL),
('school', '/skuːl/', '学校', 'The school gardens need help. 
We can water the flowers.', '', 'new', 'idle', 2, NULL),
('grape', '/ɡreɪp/', '葡萄', 'Grapes are small. Bananas are long.
Apples and oranges make you strong.', '', 'new', 'idle', 2, NULL),
('hair', ' / heə(r) /', 'n. 头发，毛发，（动、植物的）毛，一丝丝，些微，毛发织物', 'In the western world, women usually have long hair while men usually have short hair.
Internal hairs occur in the flower stalk of the yellow frog lily (Nuphar).', '', 'new', 'idle', 2, NULL),
('chair', '/ tʃeə(r) /', 'n. 椅子，教授职位，主席
v. 担任主席，主持（会议等）', 'All I need to weather a snowstorm is hot coffee, a warm fire, a good book and a comfortable chair.
My violin teacher used to play first chair with the Boston Pops.', '', 'new', 'idle', 2, NULL),
('stair', '/ steə(r) /', 'n. 楼梯，（楼梯的）一级', '', '', 'new', 'idle', 2, NULL),
('pair', '/ peə(r) /', 'n. 一双，分两个相连接部分的物体，一对（两个…），一起拉车的两匹马
v. 使配对，交配', 'I couldn''t decide which of the pair of designer shirts I preferred, so I bought the pair.
Spouses should make a great pair.', '', 'new', 'idle', 2, NULL),
('air', '/eə(r)/', '空气', 'I like fresh air.
', '', 'new', 'idle', 2, NULL),
('farm', '/fɑːrm/', '农场', 'Do you likethe farm?
Yes, Miss White. I like fresh air.', '', 'new', 'idle', 2, NULL),
('banana', '/bəˈnɑːnə/', '香蕉', 'Mike, do you like apples? 
Yes, I do. And you?
No, I don''t. I like bananas.', 'na（重读音节）：这是核心！处于重读音节，这里的 a 发饱满的短元音。英音发长音 /ɑː/，美音发梅花音 /æ/', 'new', 'idle', 2, NULL),
('apple', ' /ˈæpl/', 'n. 苹果', 'Mike, do you like apples?', '', 'new', 'idle', 2, NULL),
('also', '/ ˈɔːlsəʊ /', 'adv. 而且，此外，也', 'They had porridge for breakfast, and also toast.', '自然拼读小贴士：这是一个非常经典的“元音+l”组合（R-controlled/L-controlled vowels）。在英语中，当字母 a 后面跟着字母 l 时，a 的发音通常会发生变化，发成 /ɔː/ 的音。
类似的词还有：ball（球）、call（打电话）、tall（高的）、walk（走路）
o：在开音节（以元音结尾的音节）中，发它本身的字母音，也就是长元音 /oʊ/（像字母 O 的音）。
自然拼读小贴士：这是一个标准的“辅音+元音”开音节结构，和单词 go、no 中的 o 发音规律完全一样。', 'new', 'idle', 2, NULL),
('shirt ', '/ʃɜːt/', '衬衫', 'It can take a while to learn how to iron a shirt properly.', '', 'new', 'idle', 2, NULL),
('skirt ', '/skɜːt/', '裙子', 'The plain was skirted by rows of trees.
He skirted the issue of which parties to attend by staying at home instead.', '', 'new', 'idle', 2, NULL),
('small', ' /smɔːl/', '小的', 'Some families are small. Some are big. 
Families are different, but family love is the same', '', 'new', 'idle', 2, NULL),
('some', ' /səm, sʌm/ ', '一些', 'Some families are small. Some are big. 
Families are different, but family love is the same', '', 'new', 'idle', 2, NULL),
('aunt', '/ɑːnt/ ', ' 伯母；婶母； 舅母；姑母；姨母', 'I have an aunt.
', '', 'new', 'idle', 2, NULL),
('uncle', '/ˈʌŋ.kəl/', '伯父；叔父；舅父；姑父；姨父', 'I have an uncle', '', 'new', 'idle', 2, NULL),
('brother', ' /ˈbrʌðə(r)/ ', '哥；弟', 'Is that your brother? Yes, it is.

', '', 'new', 'idle', 2, NULL),
('cousin', '/ˈkʌzn/ ', ' 堂（表）兄弟；堂（表）姐妹', 'Is this your brother? No, it''s my cousin.
I have an uncle.
I have an aunt.
I have two cousins too.', '', 'new', 'idle', 2, NULL);
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('big', '/bɪɡ/', '大', 'Sarah, you havea big family. Is this your sister?', '', 'new', 'idle', 2, NULL),
('have', '/hæv/', '有', 'Sarah, you havea big family. Is this your sister? 
I have an uncle.
I have an aunt.
I have two cousins too.
I have a brother,
And a baby sister.
They can play with me.', '', 'new', 'idle', 2, NULL),
('family', ' /ˈfæməli/', '家；家庭 ', 'We are a family,
A happy family,
My father, my mother,
My sister and me!
We''re a family,
A happy family,
My father, my mother.
My family  is big.
Some families are small. Some are big. 
Families are different, but family love is the same.', '', 'new', 'idle', 2, NULL),
('baby', '/ˈbeɪbi/', '婴儿', 'baby sister
', '', 'new', 'idle', 2, NULL),
('sister', '/ˈsɪs.tə/', 'n. 姐妹，（称志同道合者）姐妹，修女，护士', 'This is my sister.
Sarah, you have a big family. Is this your sister?
baby sister
I have a brother,
And a baby sister.
They can play with me.', '', 'new', 'idle', 2, NULL),
('me', ' /miː/', '我', '', '', 'new', 'idle', 2, NULL),
('father', ' /ˈfɑːðə(r)/', '父亲', '', '', 'new', 'idle', 2, NULL),
('mother', '/ˈmʌðə(r)/', '妈妈。', '', '', 'new', 'idle', 2, NULL),
('grandmother', ' /ˈɡrænmʌðə(r)/', '（外）祖母；奶奶；姥姥；外婆 ', '', '', 'new', 'idle', 2, NULL),
('grandfather', ' /ˈɡrænfɑːðə(r)/', '（外）祖父；爷爷；姥爷；外公', '', '', 'new', 'idle', 2, NULL),
('grandpa', ' /ˈɡrænpɑː/ ', '爷爷', 'This is my grandpa.
Grandpa Finger, Grandpa Finger, 
where are you?
This is my grandpa.
How do you do?', '', 'new', 'idle', 2, NULL),
('grandma', '/ˈɡrænmɑː/', ' 奶奶；姥姥 ', 'This is my grandma. 
Grandma Finger, Grandma Finger, 
where are you?
This is my grandma.
How do you do?', '', 'new', 'idle', 2, NULL),
('dad', '/dæd/', '爸爸', ' Mum! Dad! This is my friend, Sarah Miller.', '', 'new', 'idle', 2, NULL),
('mum', '/mʌm/', '妈妈', ' Mum! Dad! This is my friend, Sarah Miller.', '', 'new', 'idle', 2, NULL),
('toy', '/ tɔɪ /', '玩具', 'I share my toys.', '', 'new', 'idle', 2, NULL),
('annoy', '/əˈnɔɪ/', '骚扰', 'Marc loved his sister, but when she annoyed him he wanted to switch her off.
to annoy an army by impeding its march, or by a cannonade', '', 'new', 'idle', 2, NULL),
('enjoy', '/ ɪnˈdʒɔɪ /', '享受', 'Enjoy your holidays!   I enjoy dancing.
I plan to go travelling while I still enjoy good health.', '', 'new', 'idle', 2, NULL),
('joy', '/ dʒɔɪ /', '快乐', 'They will be a source of strength and joy in your life.
the joys and demands of parenthood', '', 'new', 'idle', 2, NULL),
('good', '/ ɡʊd /', 'adj. 好的，令人愉快的，擅长的，有益的，合适的，赞同的，正直的，守规矩的，乖的，好心的，健康的，感叹，赞同，相当大的，不少于，彻底的，有趣的，足以维持的，有效的，能提供…的
n. 好处，善行
adv. 好', 'Am I a good friend? Yes, I am!
I listen and say "Hi!" I smile too.
Am I a good friend? Yes, I am!
I help and share. I play fair too', '', 'new', 'idle', 2, NULL),
('ear', ' /ɪə(r)/', '耳朵', 'Point to your ear. Listen!', '', 'new', 'idle', 2, NULL);
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('stand', '/stænd/', '站，站立', 'The Commander says we will make our stand here.
They took a firm stand against copyright infringement.', '', 'new', 'idle', 2, NULL),
('eye', '/aɪ/', '眼睛', 'Look into my eyes. Hi!', 'eye 属于自然拼读中必须死记硬背的“视觉词”
', 'new', 'idle', 2, NULL),
('help', '/help/ ', '帮助', 'I help.
I help and share. I play fair too.', '', 'new', 'idle', 2, NULL),
('name', '/neɪm/', '名字', 'My name is WuBinbin', '', 'new', 'idle', 2, NULL),
('nice', '/naɪs/', '不错的', 'Nice to meet you !', '', 'new', 'idle', 2, NULL),
('hand', '/hænd/', '手', 'Wave your hand. Hello!', '这是核心拼读规律！字母 a 夹在辅音中间，处于闭音节，所以发短元音。但这里有个小特例，当 a 后面跟着 n 或 nd 时，它的发音会从普通的 /æ/ 稍微向后拉一点，变成介于 /æ/ 和 /ɑ/ 之间的音（听起来嘴巴张得更大，更接近“啊”', 'new', 'idle', 2, NULL),
('mouth', '/maʊθ/', '嘴 ', 'Point to your mouth. Smile!', '', 'new', 'idle', 2, NULL),
('arm', '/ɑːm/ ', 'n. 臂，手臂，袖子，扶手，狭长地带，分支机构
v. 武装，提供', 'Wave your arm. Bye!', '', 'new', 'idle', 2, NULL),
('can', '/ˈkæn/', '可以, 罐头', 'It''s OK, Chen Jie. We can share', '', 'new', 'idle', 2, NULL),
('share', '/ʃeə(r)/', '分享', 'Hi. Sarah. We can share', 'are 发 /eə/：只要看到 are 在单词末尾，且前面有辅音，通常都发这个音', 'new', 'idle', 2, NULL),
('smile', ' /smaɪl/ ', '微笑', 'Point to your mouth. Smile!
I smile.
I listen and say "Hi". I smile too.', '', 'new', 'idle', 2, NULL),
('friend', '/frend/', '朋友', 'I help my friends.
I am nice to my friends.', '', 'new', 'idle', 2, NULL),
('say', '/seɪ/', 'vi. 说， 讲，表明，宣称，假设，约莫
vt. 表明，念，说明，比方说
n. 发言权，说话，要说的话，发言权', 'I say "Hi" and "Goodbye"', '', 'new', 'idle', 2, NULL),
('gray', '/ ɡreɪ /', 'n. 灰色，灰马，灰色颜料，暗淡的光线
adj. 灰色的，灰白头发的，阴暗的，（指脸因恐惧、生病等）苍白的
v. （使）变灰色
vi. 成为灰色或灰白', 'My hair is beginning to gray.
the graying of America', '', 'new', 'idle', 2, NULL),
('listen', '/ˈlɪsn/', '听', 'Point to your ear. Listen!', 't不发音
often /ˈɒfn/（经常）：t 不发音。
castle /ˈkɑːsl/（城堡）：t 不发音。
whistle /ˈwɪsl/（口哨）：t 不发音。', 'new', 'idle', 2, NULL),
('tile', '/taɪl/', '瓷砖', 'Each tile within Google Maps consists of 256 × 256 pixels.
The handyman tiled the kitchen.', '', 'new', 'idle', 2, NULL),
('pile', '/paɪl/', '桩', 'When we were looking for a new housemate, we put the nice woman on the "maybe" pile, and the annoying guy on the "no" pile
a pile of shot', '', 'new', 'idle', 2, NULL),
('file', '/faɪl/', '文件', 'I''m going to delete these unwanted files to free up some disk space.
She filed for divorce the next day.', '', 'new', 'idle', 2, NULL),
('care', '/ keə(r) /', '照料', '', '', 'new', 'idle', 2, NULL),
('dare', '/ deə(r) /', '敢', 'I wouldn''t dare argue with my boss.
I dare you (to) kiss that girl.', '', 'new', 'idle', 2, NULL);
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('band', '/bænd/', '乐队', 'valence band;  conduction band', '', 'new', 'idle', 2, NULL),
('land', '/lænd/', '土地', 'Most insects live on land.
There are 50 acres of land in this estate.', '', 'new', 'idle', 2, NULL),
('dear', '/ dɪə(r) /', '亲爱的', 'My cousin is such a dear, always drawing me pictures.
Pass me the salt, would you dear?', '', 'new', 'idle', 2, NULL),
('near', '/nɪə(r)/', '附近', 'The ship nears the land.
I can''t see near objects very clearly without my glasses.', '', 'new', 'idle', 2, NULL),
('buy', '/baɪ/', 'v. 购买，够支付，获得，收买，相信
n. 划算的东西，购买', 'At only $30, the second-hand kitchen table was a great buy.
I''m going to buy my father something nice for his birthday.', '拼读规律：在英语里，uy 这个组合非常少见，它通常只出现在 buy 和 guy（家伙）这两个常用词里。虽然它看起来和咱们之前聊过的 y 结尾的词（如 play, sunny）有点像，但它的发音规则完全不同。
记忆小贴士：可以告诉孩子，uy 组合就像是一个“特殊暗号”，只要看到它，就直接发 /aɪ/ 的音', 'new', 'idle', 2, NULL),
('dolphin', '/ˈdɒlfɪn/', '海豚', '', '', 'new', 'idle', 2, NULL),
('phone', '/fəʊ̯n/', '电话', '', '', 'new', 'idle', 2, NULL),
('photo', '/ˈfəʊ.təʊ/', '照片', 'There are many old things and photos.', 'pho：这里的 ph 组合发 /f/ 的音（源自希腊语）。关键在于后面的 o，它处于开音节（以元音结尾的音节），所以发字母本音，也就是长元音 /əʊ/ 或 /oʊ/。
to：这里的 t 发 /t/。后面的 o 同样处于开音节，也发字母本音 /əʊ/ 或 /oʊ/。
3. 拼读小拓展', 'new', 'idle', 2, NULL),
('place', '/pleɪs/', ' 地方；场所', 'My favourite place is the museum.
Write about a place in your community.', '', 'new', 'idle', 2, NULL),
('favourite', '/ˈfeɪv.rɪt/', '最喜欢的', 'My favourite place is the museum.
There are many old things and photoes.', '结尾是 -our，但发音弱化为 /ə/）。', 'new', 'idle', 2, NULL),
('community', '/kəˈmjuːnəti/', '社区', 'There is a park in your community.
There is a playground in my community.
There is a shop in our dream community.', '', 'new', 'idle', 2, NULL),
('walk', '/wɔːk/', ' 散步；行走', 'take a walk 散步
There is beautiful park. I often take a walk there.
My family often take a walk there.', '', 'new', 'idle', 2, NULL),
('morning', '/ˈmɔːnɪŋ/', '早....', 'I''ll see you tomorrow morning.', '', 'new', 'idle', 2, NULL),
('fork', '/fɔːk/', '叉', 'West Fork White River and East Fork White River join together to form the White River of Indiana.
LibreOffice is a fork of OpenOffice.', '', 'new', 'idle', 2, NULL),
('sport', '/spɔːt/', '体育运动', 'do sports.
Let''s do some sports.
There is a playground in my community. I often do sports there.', '', 'new', 'idle', 2, NULL),
('library', ' /ˈlaɪbrəri/', 'n. 图书馆，藏书楼，藏书，书屋，书斋，图书出租处', 'This is a library.
Wow. There are so many books.', '', 'new', 'idle', 2, NULL),
('bus stop ', '/bʌs/ /stɒp/', '公共汽车站 ', '', '', 'new', 'idle', 2, NULL),
('toilet', '/ˈtɔɪ.lət/', 'n. 洗手间，坐便器，梳洗', 'Sorry, I was in the toilet.
toilets', '', 'new', 'idle', 2, NULL),
('shop', '/ʃɒp/', '商店', 'Look! There is a shop.
go shopping
There is a shop. I go shopping there.', '', 'new', 'idle', 2, NULL),
('hospital', '/ˈhɒs.pɪ.tl̩/', '医院', 'pet hospital
There is a hospital. I see a doctor there.', '', 'new', 'idle', 2, NULL);
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('over', ' /ˈəʊvə(r)/ ', '在……的远端
（或对面）', 'There is a nice park over there.', '', 'new', 'idle', 2, NULL),
('park', '[paːk]', '公园', 'He likes the park. We often play games here.
There is also a nice park over there.
There is a park in your community.
We are at the park. Look! There is a shop
Some ducks are in the park.
There is a beautiful park. I often take a walk there.
The museum is in a nice park. We often play in the park.
There is a big lake in the park.', '', 'new', 'idle', 2, NULL),
('playground ', '/ˈpleɪɡraʊnd/', '操场上', 'There is a playground.
There is a playground in my community.', '', 'new', 'idle', 2, NULL),
('there', '/ðeː(r)/', '（表示存在*或发生）；在那里 ', 'Your neighbours are very friendly.
Yes, they are. There is a playground. We often play there.
There is also a nice park over there.
There is a park in your community.
I often play there with my friends.
Look! There is a shop.
There is a hospital.
There is also a playground.
The poor ducklings feel cold there.
There are so many books.
There is a taiquan club,
There is a gym too.
There are so many people.', '', 'new', 'idle', 2, NULL),
('afternoon', '/ ˌɑːftəˈnuːn /', 'n. 下午，午后', '', 'Good afternoon!
', 'new', 'idle', 2, NULL),
('always', ' /ˈɔːlweɪz/ ', '总是', 'Liu Jia is kind. She alway makes me smile.', '', 'new', 'idle', 2, NULL),
('basketball', '/ˈbɑːs.kɪt.bɔːl/', 'n. 篮球（运动）', 'I often play football and basketball
', '这是一个非常专业且敏锐的问题！自然拼读绝对不仅适用于英音，它同样完美适用于美音。
你之所以会产生“美音不遵循自然拼读”的错觉，是因为自然拼读规则中有一个非常核心的概念：开音节与闭音节。而美式发音和英式发音在“闭音节”的处理上，存在一个著名的差异。
让我们用 basket 这个词来拆解一下：
1. 自然拼读的“闭音节”规则
按照最基础的自然拼读规则：当一个元音字母（如 a）后面跟着一个或多个辅音字母（如 s, k）结尾时，这个元音处于“闭音节”中，通常要发短元音。
在美式发音中，basket 的 bas 就是一个标准的闭音节，所以 a 发短元音 /æ/（梅花音）。这完全符合自然拼读规则。
2. 英式发音的“特殊变化”
在英式发音中，有一个特殊的规则：当字母 a 后面跟着 s, f, th, sk 等辅音组合时，英音往往会把这个短元音“拉长”，发成长元音 /ɑː/。
所以在英音里，basket 读作 /ˈbɑːskɪt/，class 读作 /klɑːs/，fast 读作 /fɑːst/。
这其实是英音的一种历史演变，它打破了基础的闭音节规则。
💡 总结与辅导建议：
美音更“守规矩”：对于初学者来说，美式发音其实更严格地遵循了“闭音节发短元音”的基础自然拼读规则。
英音有“特殊规律”：英式发音则多了一套“a 在 s/f/th 前发长音”的特殊规律。
国内的人教版PEP教材在语音教学上，其实融合了这两种体系。比如低年级的 cat, map 教的是短元音 /æ/（符合美音和基础规则），但到了高年级或者某些特定单词（如 class, basket）的配套音频中，又会采用英式的 /ɑː/ 发音。
所以，自然拼读是通用的，只是英美音在个别字母的发音习惯上有所不同。带孩子学习时，只要告诉他“这是英音的特殊读法，美音则遵循短元音规则”，孩子就能很清晰地理解啦！
', 'new', 'idle', 2, NULL),
('football', '/ˈfʊtbɔːl/', 'n. 足球〔美国通常指橄榄球〕，足球运动，屡屡引起争论（或分歧）的问题，被踢来踢去的难题', 'We play football together.
I play football. My friend plays football with me.
I often play football and basketball.', '虽然 oo 在 room 里发长音，但在 ook 和 oot 这类组合里，它通常发短促的 /ʊ/ 音。
类似的词还有：book（书）、look（看）、good（好的）。', 'new', 'idle', 2, NULL),
('game', '/ɡeɪm/', '游戏', 'We play games together.
I play games. My friend plays games with me.
She likes weiqi, but I like ball games.
He likes the park. We often play games here.
', '', 'new', 'idle', 2, NULL),
('play', '/pleɪ/', 'n. 比赛，游戏，戏剧
v. 玩，演奏，播放，扮演，装扮，参加比赛', 'We play games together.
We play football together.
I play games. My friend plays games with me.
I play football. My friend plays football with me.', '. 开头辅音组合：pl
pl：发 /pl/ 的音。
自然拼读小贴士：这是一个经典的“辅音连缀”。p 和 l 各自发自己的音，快速拼在一起。类似的词还有：plane（飞机）、plate（盘子）、plant（植物）。
2. 结尾元音组合：ay
ay：发双元音 /eɪ/（发音像字母 A 的本音）。
自然拼读小贴士：这是一个非常稳定且高频的元音组合。在英语中，当 a 和 y 组合在单词结尾时，通常都发长元音 /eɪ/。
类似的词还有：day（天）、say（说）、way（路）、may（可以）。', 'new', 'idle', 2, NULL),
('Chinese', '/ˌtʃaɪˈniːz/', 'n. 中国人，华人，中文，汉语
adj. 中国的，中国人的，中国话的，中文的', 'My grandpa teach Chinese.
My grandpa is a Chinese teacher.
People speak Chinese in China.
He helps me with Chinese.
I help my friend with Chinese.', 'ese：发长元音 /iːz/。
自然拼读小贴士：这是一个标准的“元音+辅音+不发音e”结构（魔法e）。结尾的不发音 e 让前面的元音字母 e 发它本身的字母音（长元音 /iː/），而 s 夹在两个元音之间，发浊辅音 /z/。
类似的词还有：cheese（奶酪）、these（这些）。', 'new', 'idle', 2, NULL),
('read', '/riːd/', '读', 'reading time.
He reads book with me.
I read books.
My friend reads book with me .
She often reads book with me.', '', 'new', 'idle', 2, NULL),
('best', ' /best/', '最好的', 'Who is your best friend?
My best friend is John.
My best friend.
We are best friends.', '', 'new', 'idle', 2, NULL),
('quiet', '/ˈkwaɪət/', '文静的', 'She is quiet and kind.', '', 'new', 'idle', 2, NULL),
('kind', '/kaɪnd/', 'n. 种类，同类人
adj. 体贴的，仁慈的', 'He is also kind, he often helps me.
She is quiet and kind.
My best friend is John. He is very kind, he often helps me with English.
Liu Jia is kind. She always maks me smile. We are best friends.', '', 'new', 'idle', 2, NULL),
('also', ' /ˈɔːlsəʊ/', '也', 'We can also make a gift.
Mum is also a great cook.
He is also kind, he often helps me.', '自然拼读小贴士：这是一个非常经典的“元音+l”组合（R-controlled/L-controlled vowels）。在英语中，当字母 a 后面跟着字母 l 时，a 的发音通常会发生变化，发成 /ɔː/ 的音。
类似的词还有：ball（球）、call（打电话）、tall（高的）、walk（走路）
o：在开音节（以元音结尾的音节）中，发它本身的字母音，也就是长元音 /oʊ/（像字母 O 的音）。
自然拼读小贴士：这是一个标准的“辅音+元音”开音节结构，和单词 go、no 中的 o 发音规律完全一样。', 'new', 'idle', 2, NULL),
('hair', '/heə(r)/', 'n. 头发，毛发，（动、植物的）毛，一丝丝，些微，毛发织物', 'Some friends'' hair is short. Some friends'' hair is long.
He has nice short hair too.
He has long hair.
She has long hair.', '', 'new', 'idle', 2, NULL),
('strong', ' /strɒŋ/', 'adj. 强的，坚强的，强烈的，强壮的', 'Look, he is tall and strong.
strong or not, they help each other.', '', 'new', 'idle', 2, NULL),
('his', '/hɪz/', '他的', 'He can look after his sister.
What''s his name?
His name is Zhang Peng.
He has short legs, but his body is very long.', '', 'new', 'idle', 2, NULL),
('child', '/tʃaɪld/', 'n. 儿童，小孩，子女 （复数children*/ˈtʃɪldrən/）', 'How do these children help at home?
You are still a child. What can you do?', '在英语自然拼读中，当元音字母 i 后面跟着 ld 或 nd 组合时，i 通常会发它本身的字母音（长元音 /aɪ/）', 'new', 'idle', 2, NULL);
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('people ', ' /ˈpiːpl/', 'n. 人，人类，居民，人民，种族
vt. 居住于，布满，使住满人，在…殖民，把动物放养在', 'People speak Chinese in China.
You are a great nurse. You help many people. I can help you at home.', '', 'new', 'idle', 2, NULL),
('together', '/ təˈɡeðə(r) /', '在一起', 'What do family do together?
We cook together.
We are happy together.
I have a happy family, we often cook togeter.', '', 'new', 'idle', 2, NULL),
('floor', '/flɔː/', 'n. 地面，地板，楼层，底部，议员席
vt. 铺地板，击败，打倒', 'I can sweep the floor.
Can he help? Yes, he can, he can sweep the floor.
We sweep the floor', '', 'new', 'idle', 2, NULL),
('sweep', '/swiːp/', 'v. 打扫，拂去，梳（头发），挥动（手臂），席卷，扫过，迅速传播，大模大样地走，彻底删掉，延伸，轻松赢得
n. 打扫，挥动，搜索，扫荡，广泛性，(道路、河流)绵延弯曲的地带', 'Can he help? Yes, he can, he can sweep the floor.
We sweep the floor.
I sweep the floor.  It''s easy.
I am a big boy now. I can sweep the floor.', '', 'new', 'idle', 2, NULL),
('look after', '/ lʊk ˈɑːftə(r) /', '照顾', 'I look after my sister.
I look after my doggy.
I can cook, I can look after my baby sister too!', '', 'new', 'idle', 2, NULL),
('room', ' / ruːm /', 'n. 房间，空间，余地，房间里所有的人
vt. 租房，合住，为…提供住处，投宿，住宿，留…住宿', 'Can you help? Yes, I can, I can clean my room.
I can clean the room.', '', 'new', 'idle', 2, NULL),
('busy', '/ˈbɪzi/', '忙', 'Mum and Dad are busy and tired.
Mum is very busy, we can help her at home.', 'busy在古英语里，它的拼写和发音跟现在完全不同，演变到现代英语后，拼写保留了 u，但发音却变成了 /ɪ/。', 'new', 'idle', 2, NULL),
('cook', '/ kʊk /', 'v. 烹饪，煮，烧
n. 厨师，做饭的人', 'I can cook.
We cook together.
I cook for my family.
Mum is also a great cook.
She can cook great food', '', 'new', 'idle', 2, NULL),
('clean', '/kleːn/', 'adj. 干净的，无污染的，清白的，清新的，公平的，完全的，简洁的
v. 清洗，打扫
adv. 彻底，完全
n. 打扫，清扫', 'I can clean the room', '', 'new', 'idle', 2, NULL),
('chore', '/tʃɔː/', 'n. 琐事，令人厌烦的任务，家务活', 'We can do some chores', '', 'new', 'idle', 2, NULL),
('tired', '/taɪəd/', 'adj. 累的，疲劳的，厌倦的，陈旧的
v. （使）疲劳，困倦，厌烦（tire的过去式）', 'Mum and Dad are busy and tired', 'ired：发双元音 /aɪ/ 加上卷舌音 /ərd/。
自然拼读小贴士：这是一个非常经典的“元音 + 辅音 + 不发音e”结构（也就是我们常说的“魔法e”或“相对开音节”）。
中间的元音字母 i 发它本身的字母音，也就是长元音 /aɪ/。
结尾的 re 组合发卷舌音 /ərd/。
类似的词还有：fire（火）、hire（雇佣）、wire（电线）。', 'new', 'idle', 2, NULL),
('factory', ' / ˈfæktri; ˈfæktəri /', 'n. 工厂，制造厂', 'chicken factory; pig factory
factory worker', 'y：在单词结尾，y 通常发长元音 /i/
这是非常经典的结尾规律，和单词 happy、candy、baby 中的 y 发音完全一样
区分单音节与多音节：
1. 像 cry, dry, try 这种只有一个音节的词，y 发双元音 /aɪ/（因为它是词尾唯一的元音，要发长音）。
2. 像 library, hungry 这种多音节词，ry 都在非重读音节，发 /ri/。
拼读练习：
可以让孩子先读 berry，然后加上不同的首字母，变成 cherry、carry、hurry，这样能帮孩子快速掌握拼读规律。
y 前面是辅音，发 /i/ 音（如 happy, baby）。
y 前面是 a，发 /eɪ/ 音（如 play, day）。
y 前面是 o，发 /ɔɪ/ 音（如 boy, toy）。', 'new', 'idle', 2, NULL),
('office', '/ ˈɒfɪs /', '办公室，办公楼', 'office worker', '', 'new', 'idle', 2, NULL),
('job', '/ dʒɒb /', '工作', 'What''s your mother''s job?
What''s your father''s job?', '', 'new', 'idle', 2, NULL),
('pool', ' / puːl /', '池塘', 'the pools of Solomon
There is a limited pool of candidates from which to choose the new manager.', '', 'new', 'idle', 2, NULL),
('boot', '/ buːt /', '靴子', 'The ski had become disconnected from the boot.', '', 'new', 'idle', 2, NULL),
('farmer', '/fɑːmə/', 'n. 农民，农场主', 'a farmer of the revenues', '', 'new', 'idle', 2, NULL),
('nurse', '/nɜːs/', 'n. 护士，看护，奶妈，保姆，阿妈，保育员，保护人，培养者，养成所，发祥地，[植]保护树，[虫]保护虫，保育虫，[动]世代交替的无性期的个体
vt.& vi. 护理，照料，喂，吃奶
vt. 培育，怀抱，搂抱，调治', 'They hired a nurse to care for their young boy.
The nurse made her rounds through the hospital ward.', '', 'new', 'idle', 2, NULL),
('doctor', '/ˈdɒktə/', 'n. 医生，大夫，博士
v. 篡改，伪造，（将有害物）掺入（饮食）', 'If you still feel unwell tomorrow, see your doctor.
the doctor of a calico-printing machine, which is a knife to remove superfluous colouring matter', 'r：在非重读音节中，or 组合通常弱化成中央元音 /ər/（美式）或 /ə/（英式）。
自然拼读小贴士：虽然 or 在重读音节中通常发长元音 /ɔːr/（如 horse），但在 doctor 这个词里，重音在第一个音节，所以第二个音节读得非常轻，发成了弱读音 /ər/。
类似的词还有：actor（演员）、sister（姐妹）、water（水）。', 'new', 'idle', 2, NULL),
('warm', '/wɔːm/', '温暖的', 'The tea is still warm.
We have a warm friendship.', '', 'new', 'idle', 2, NULL);
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('tool', '/tuːl/', '工具', 'Hand me that tool, would you?   I don''t have the right tools to start fiddling around with the engine.
These are the tools of the trade.', '', 'new', 'idle', 2, NULL),
('drink', '/drɪŋk/', 'v. 喝（酒）
n.  一杯，酒（会）', 'He drank the water I gave him.
Jack drank the whole bottle by himself.', '', 'new', 'idle', 2, NULL),
('kind', '/kaɪnd/', 'n. 种类，同类人
adj. 体贴的，仁慈的', 'This is a strange kind of tobacco.
The opening served as a kind of window.', '', 'new', 'idle', 2, NULL),
('grow', '/ɡrəʊ/', 'v. 生长，栽种，变长，成长，变得，增加，发展，壮大，提升品质', 'Children grow quickly.
A long tail began to grow from his backside.', '', 'new', 'idle', 2, NULL),
('window', '/ˈwɪndəʊ/', 'n. 窗户，窗口，陈列窗，空当', 'To separate out the chaff, early cultures tossed baskets of grain into the air and let the wind blow away the lighter chaff.
launch window;  window of opportunity;  You have a two-hour window of clear weather to finish working on the lawn.', '', 'new', 'idle', 2, NULL),
('snow', '/snəʊ/', 'n. 雪，雪花，积雪，雪季
vt. 使纷纷落下，使变白，下雪，被雪覆盖，被雪阻挡
vi. 降雪', 'We have had several heavy snows this year.
It is snowing.', '', 'new', 'idle', 2, NULL),
('town', '/taʊn/', 'n. 城镇，市镇，小村庄，城镇居民，商业中心', 'This town is really dangerous because these youngsters have Beretta handguns.
I''ll be in Yonkers, then I''m driving into town to see the Knicks at the Garden tonight.', '', 'new', 'idle', 2, NULL),
('down', '/ daʊn /', 'prep. 往…的下端，在…下方，沿着，贯穿
adv. 往下，(坐)下，下跌，从上至下，向南方，失去钱，预付，到某地
v. 咽下，击倒
adj. 悲伤，停机
n. 绒毛，分段进攻', '', '', 'new', 'idle', 2, NULL),
('cow', '/kaʊ/', 'n. 奶牛，母牛，雌性动物，婆娘
v. 恐吓，吓唬，威胁', '', '', 'new', 'idle', 2, NULL),
('quite', '/kwaɪt/', 'adv. 很，相当，非常，的确，确实如此', '', '', 'new', 'idle', 2, NULL),
('quick', '/kwɪk/', 'adj. 快的，急速的，聪明的，凌厉的，灵活的，短时间做成的
adv. 迅速地，快速地
n. （指甲下的）活肉，感情的中枢，感觉最敏锐的地方，要害，核心', 'He''s a quick runner.
That was a quick meal.', '', 'new', 'idle', 2, NULL),
('word', '/wɜːd/', 'n. 单词，字，话（语），歌词，诺言，消息，命令，短时间的谈话
v. 措词，用词', 'mum''s the word
Have you had any word from John yet?', '', 'new', 'idle', 2, NULL),
('world', '/wɝld/', 'n. 世界，国家，人类，人生，界，环境，星球
adj. 举世瞩目的', 'There will always be lovers, till the world’s end.
People are dying of starvation all over the world.', '', 'new', 'idle', 2, NULL),
('work', '/wɜːk/', 'v. （使）工作，干活，从事…工作，用功，争取，管理，就职，研究，帮助，（使）运转/行，（使）奏效，起作用
n. 工作，职业，职责，工作地点，劳动，作品，作为，修建，工厂', 'We don''t have much time. Let''s get to work piling up those sandbags.
Tell me you''re using clean works at least.', '', 'new', 'idle', 2, NULL),
('dream', '/driːm/', 'n. 梦（想），理想，美好的事，胡思乱想
v. 做梦，渴望，想到', 'a dream of bliss
Stop dreaming and get back to work.', '', 'new', 'idle', 2, NULL),
('head', '/ hed /', 'n. 头，心智，前端，顶部，校长，领导人，脓头，源头，叶球，泡沫，头数，磁头，硬币正面
v. 排在前头，居…之首，掌管，朝着，标题为，用头顶球', 'Be careful when you pet that dog on the head; it may bite.
What does it say at the head of the page?', '', 'new', 'idle', 2, NULL),
('dress', '/drɛs/', 'n. 连衣裙，衣服
v. （给…）穿衣，打扮，装饰，穿正式服装，包扎，烹饪调制，加工处理', 'Amy and Mary looked very pretty in their dresses.
He came to the party in formal dress.', '', 'new', 'idle', 2, NULL),
('queen', '/kwiːn/', 'n. 女王，王后，杰出女性，（纸牌中的）王后， （国际象棋中的）后
vt. 立…为王后（或女王），使…成为国王的妻子，[国际象棋]使（兵）成为后', '', '', 'new', 'idle', 2, NULL),
('question', '/ˈkwɛstjən/', 'n. 问题，议题，怀疑，考题
v. 问，怀疑', 'What is your question?
The question of seniority will be discussed at the meeting.', '', 'new', 'idle', 2, NULL),
('light', '/lʌɪt/', 'n. 光，发光体，点火物，眼光，亮色，窗
v. 照亮，点燃，用光指引
adj. 天色亮的，光线充足的，浅色的，轻便的，轻的，轻柔的，轻松的，少量的，愉快的，不严肃的，清淡的，松软的，低度酒的，易醒的', 'As you can see, this spacious dining-room gets a lot of light in the mornings.
Put that light out!', '', 'new', 'idle', 2, NULL);
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('high', '/haɪ/', 'adj. 高的，高度为…的，富含…的，重要的，显赫的，先进的，全盛的，不新鲜的，崇高的，兴奋的，有醉意的
n. 最高点，反气旋，兴奋，学校名
adv. 在高处，高，大，音调高', 'It was one of the highs of his career.
That pill gave me a high for a few hours, before I had a comedown.', '', 'new', 'idle', 2, NULL),
('night', '/naɪt/', 'n. 夜，晚上，（举行盛事的）夜晚', 'How do you sleep at night when you attack your kids like that!?
a night on the town', '', 'new', 'idle', 2, NULL),
('star', '/stɑː(ɹ)/', 'n. 星，星状物，星级，明星
v. 主演，（在文字等旁）标星号', 'Many Hollywood stars attended the launch party.
His teacher tells us he is a star pupil.', '', 'new', 'idle', 2, NULL),
('letter', '/-ɾə(r)/', 'n. 信，证书，许可证，字母，文字，字面意义
vt. 用字母标明，写字母于，加标题
vi. 写印刷体字母', 'There are twenty-six letters in the English alphabet.
I wrote a letter to my sister about my life.', '', 'new', 'idle', 2, NULL),
('dinner', '/ˈdɪnə/', 'n. （中午或晚上的）正餐，主餐，宴会', 'Give the dog its dinner.', '', 'new', 'idle', 2, NULL),
('apple', '/ˈæp.əl/', 'n. 苹果', '', '', 'new', 'idle', 2, NULL),
('many', '/ˈmæni/', 'adj. 许多，多的
pron. （与复数动词连用）大多数人', 'Democracy must balance the rights of the few against the will of the many.
Many are called, but few are chosen.', 'ma的发音比较特殊，不按套路，历史遗留问题，记住就好', 'new', 'idle', 2, NULL),
('sunny', '/ˈsʌni/', 'adj. 和煦的：照到阳光的，快活的，性情开朗亲切的', 'Whilst it may be sunny today, the weather forecast is predicting rain.
I would describe Spain as sunny, but it''s nothing in comparison to the Sahara.', '', 'new', 'idle', 2, NULL),
('baby', '/ˈbeɪbi/', 'n. 婴儿，幼崽，最年幼的成员，幼稚的人，宝贝儿
adj. （蔬菜）幼嫩的
v. 百般呵护', 'When is your baby due?
Stand up for yourself – don''t be such a baby!', '', 'new', 'idle', 2, NULL),
('point', '/pɔɪnt/', 'n. 观点，要点，意义，目的，细节，特点，地点，时刻，尖，点，分，罗经点，插座
v. 指（向）向，瞄准，勾缝，表明，强调', 'point de Venise; Brussels point
The dog came to a point.', '', 'new', 'idle', 2, NULL),
('coin', '/kɔɪn/', 'n. 硬币
v. 创造（新词语），很快地赚（钱）', 'She spent some serious coin on that car!
What''s the best coin to buy right now?', '', 'new', 'idle', 2, NULL),
('turn', '/tɜːn/', 'v. （使）转动，旋转，转身，扭转，翻（转），转弯，朝着，释放，（使）变成，到达（某一年龄或时间），（潮）涨/落，求助于，
n. 转变，转动，转弯（处），弯道，轮班，次序，散步，世纪之交/新年伊始，（疾病）瞬间发作', 'They say they can turn the parts in two days.
We turned a pretty penny with that little scheme.', '', 'new', 'idle', 2, NULL),
('out', '/ aʊt /', 'adv. 出局，在外，在外部，完全，彻底，出版
prep. （表示来源）从，（从…里）出来，（表示不在原状态）脱离，离去
vt. 使熄灭，揭露，驱逐
n. 不流行，出局', 'They wrote the law to give those organizations an out.
A Brazilian company outed the new mobile phone design.', '', 'new', 'idle', 2, NULL),
('mouse', ' / maʊs /', 'n. 老鼠，鼠标，羞怯[胆小]的人，[非正式用语] 眼部青肿', 'Captain Higgins moused the hook with a bit of marline to prevent the block beckets from falling out under slack.', '', 'new', 'idle', 2, NULL),
('house', '/ haʊs /', 'n. 房屋，全家人，（从事某种生意的）公司，（英国）下议院
v. 给…提供住房，收藏，安置', 'This is my house and my family''s ancestral home.
On arriving at the zoo, we immediately headed for the monkey house.', '', 'new', 'idle', 2, NULL),
('burn', '/bɜːn/', 'v. 燃烧，烧毁，烧焦，烧伤，晒伤，发烫，发光，脸红，有强烈的情感，飞驰，激怒，刻录
n. 烧伤，烫伤，烫痕，溪流', 'She had second-degree burns from falling in the bonfire.
chili burn from eating hot peppers', '', 'new', 'idle', 2, NULL),
('head', '/ hed /', 'n. 头，心智，前端，顶部，校长，领导人，脓头，源头，叶球，泡沫，头数，磁头，硬币正面
v. 排在前头，居…之首，掌管，朝着，标题为，用头顶球', 'Be careful when you pet that dog on the head; it may bite.
What does it say at the head of the page?', '', 'new', 'idle', 2, NULL),
('stay', '/steɪ/', 'v. 停留，保持，暂时
n. 停留，逗留（时间），做客，（船桅的）支索', 'I hope you enjoyed your stay in Hawaii.
The governor granted a stay of execution.', '', 'new', 'idle', 2, NULL),
('may', '/meɪ/', 'aux. 可以，也许，会，但愿
n. [May]五月，山楂属植物，（五朔节装饰用的）绿枝花枝，（春天开花的）绣线菊属植物', 'you may smoke outside;  may I sit there?
he may be lying;  Schrödinger''s cat may or may not be in the box', '', 'new', 'idle', 2, NULL),
('way', '/weɪ/', 'n. 方法，形式，方面，习俗，作风，路径，方向，距离
adv. 远远地，大量', 'You''re going about it the wrong way.  He''s known for his quirky ways.  I don''t like the way she looks at me.
When I returned home, I found my house and belongings in a most terrible way.', '', 'new', 'idle', 2, NULL);
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('day', '/deɪ/', 'n. 一天，白天，工作日，时代', 'I''ve been here for two days and a bit.
The day begins at midnight.', '', 'new', 'idle', 2, NULL),
('plane', '/pleɪn/', 'n. 水平，平面，飞机，木工刨
adj. 平的，平坦的
vt. 用刨刨平，小船等擦着水面疾驶
vi. 鸟滑翔', '', '', 'new', 'idle', 2, NULL),
('Japanese', '/ˌdʒæpəˈniːz/', 'n. 日本人，日本国民，日语
adj. 日本的，日本人的，日语的', '', '', 'new', 'idle', 2, NULL),
('cheese', '/t͡ʃiz/', 'n. 奶酪，干酪', 'Say "cheese"! ... and there we are!', '', 'new', 'idle', 2, NULL),
('purse', '/pɜːs/', 'n. 钱包，钱袋，财力，财源，和包或钱袋相似的东西，女用小提包
vt. 使皱起，噘起', '', '', 'new', 'idle', 2, NULL),
('walk', '/wɔːk/', 'v. 走，步行，徒步旅行，散步，陪同，护送，遛（狗），不翼而飞
n. 行走，步行，徒步旅行，散步，步行的路径/距离，步态，步行速度，小路，人行道', 'To walk briskly for an hour every day is to keep fit.
If you can’t present a better case, that robber is going to walk.', '', 'new', 'idle', 2, NULL),
('fair', '/feː(ə)/', 'adj. 公平的，合理的，相当多的，浅色的，白皙的，晴朗的
n. 游乐场，集市，展销会
adv. 公正地', 'When will we learn to distinguish between the fair and the foul?
Monday''s child is fair of face.', '', 'new', 'idle', 2, NULL),
('string', '/stɹɪŋ/', 'n. 细绳，一串，一行，一系列，弦，弦乐器，字符串，特定条件
v. 悬挂，把…连在一起，给…装弦
adj. 管弦乐的，线的', 'There were stalls for fourteen horses in the squire''s stables.
a bowstring', '', 'new', 'idle', 2, NULL),
('street', '/stɹiːt/', 'n. 大街，街道', 'Walk down the street until you see a hotel on the right.
I live on the street down from Joyce Avenue.', '', 'new', 'idle', 2, NULL),
('mild', '/ˈmaɪld/', 'adj. 温柔的，温暖的，轻微的，（味道）不浓的
n. 淡味麦芽啤酒', 'a mild man
He received a mild sentence.', '', 'new', 'idle', 2, NULL),
('hurt', '/hɜːt/', 'v. 使…受伤，感到疼痛，弄伤，使伤心，危害，处于困境
adj. 受伤的
n. 伤心', 'how to overcome old hurts of the past
Does your leg still hurt? / It is starting to feel better.', '', 'new', 'idle', 2, NULL),
('wild', '/waɪld/', 'adj. 野生的，荒凉的，缺乏管教的，盲目的，高兴的，感情炽烈的，狂热的，愤怒的，双目圆睁的，未经思索的，暴风雨的
n. 自然环境，野生状态，偏远地区', 'After mending the lion''s leg, we returned him to the wild.
Przewalski''s horses are the only remaining wild horses.', '', 'new', 'idle', 2, NULL),
('cry', '/kɹaɪ̯/', 'v. 哭，喊，叫
n. 哭，呼喊，叫声，迫切需要，抗议，口号', 'After we broke up, I retreated to my room for a good cry.
I heard a cry from afar.', '', 'new', 'idle', 2, NULL),
('poor', '/poː/', 'adj. 贫穷的，贫乏的，令人怜悯的，可怜的，匮乏的，低劣的
n. the poor 贫困者，穷人', 'The poor are always with us.
We were so poor that we couldn''t afford shoes.', '', 'new', 'idle', 2, NULL),
('door', '/dɔː/', 'n. 门，出入口，门口，住户，人家', 'I knocked on the vice president''s door
the 24 doors in an Advent calendar', '', 'new', 'idle', 2, NULL),
('dry', '/dɹaɪ/', 'adj. 干（燥）的，干旱的，冷淡的，枯竭的，枯燥的
v. （使）变干
n. 干燥，少雨', 'This towel is still damp: I think it needs another dry.
The clothes dried on the line.', '', 'new', 'idle', 2, NULL),
('sleep', '/sliːp/', 'vi. 睡，睡觉，睡眠状态
vt. 为…提供床位，提供住宿，以睡觉打发日子
n. 睡眠', 'You should sleep 8 hours a day.
This caravan can sleep four people comfortably.', '', 'new', 'idle', 2, NULL),
('feet', '/fiːt/', 'n. 脚( foot的名词复数 )，底部，英尺(=12 英寸或 30.48 厘米)，脚步', 'A spider has eight feet.
Southern Italy is shaped like a foot.', '', 'new', 'idle', 2, NULL),
('bee', '/ˈbiː/', 'n. 蜜蜂，聚会', '', '', 'new', 'idle', 2, NULL),
('try', '/tɹaɪ/', 'v. 尝试，努力，争取，试用/做/验，审判
n. 尝试，努力，持球触地得分', 'I gave unicycling a try but I couldn’t do it.
I gave sushi a try but I didn’t like it.', '', 'new', 'idle', 2, NULL);
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('speak', '/spiːk/', '说话', 'Corporate speak; IT speak.
I was so surprised I couldn''t speak.', '', 'new', 'idle', 2, NULL),
('mean', '/miːn/', 'v. 意思是，打算，意味着，意义重大，表明，对…当真
adj. 吝啬的，刻薄的
n. 中庸，平均', 'Does she really mean what she said to him last night?
One faltering step means certain death.', '', 'new', 'idle', 2, NULL),
('bean', '/biːn/', 'n. 豆，豆荚，豆科植物，（一文）钱
v. 击中头部', 'I haven''t got a bean.
The pitcher beaned the batter, rather than letting him hit another home run.', '', 'new', 'idle', 2, NULL),
('clear', '/klɪə(ɹ)/', 'adj. 易懂的，清楚的，显然的，透明的，明亮的，畅通的，晴朗的，光洁的，无愧的，远离的
v. 理清，清除，（雾霭）退去，跳过，兑现，结算，批准，证明无罪
adv. 一直，径直，不靠近', 'a room ten feet square in the clear
If you clear the table, I''ll wash up.', '', 'new', 'idle', 2, NULL),
('read', '/ɹiːd/', 'v. 阅读，识字，读懂，朗读，念，读到，查阅到，懂得，理解，写着，显示，听到，学习，攻读，读取文件
n. 阅读，读书，读物
adj. 博学的，精通的', 'His thrillers are always a gripping read.
What''s your read of the current political situation?', '', 'new', 'idle', 2, NULL),
('tea', '/tiː/', 'n. 茶水，茶，茶树，午后小吃', 'After smoking a bowl of that fine marijuana, they ate some brownies.
a fish supper; a pizza supper', '', 'new', 'idle', 2, NULL),
('fly', '/flaɪ/', 'vi. 飞，飞行，（旗）飘荡，过得快
vt.& vi. 乘（…的）飞机，驾驶（飞机等）
vt. 驾驶，空运，使飞翔，操作
n. 苍蝇，（作钓饵的）苍蝇，（裤子的）前裆开口，门帘
adj. 机灵的；机警的；不会上当的,时髦迷人的；漂亮的', '', '', 'new', 'idle', 2, NULL),
('cookie', '/ˈkuːki/', 'n. 曲奇饼， 网络饼干（记录上网用户信息的软件）', '', '', 'new', 'idle', 2, NULL),
('hook', ' / hʊk /', 'n. 钩，钩拳，吸引人的东西，曲线球
v. 吊住，钩住，钓（鱼），打曲线球，吸引，连接，上网', 'He is not handling this job, so we''re giving him the hook.
The song''s hook snared me.', '', 'new', 'idle', 2, NULL),
('look', '/ lʊk /', 'v. 看，浏览，留心，看起来，好像，找寻，朝向
n. 看，查找，表情，考虑，外观，容貌，时尚
int.  （常为不悦时唤起他人注意）喂，听我说', '', '', 'new', 'idle', 2, NULL),
('why', '/waɪ/', 'adv. 为什么，何必，…的原因
conj. （用于从句句首）为什么
int. 哎呀，哟', 'A good article will cover the who, the what, the when, the where, the why and the how.
That''s the reason why I did that.', '', 'new', 'idle', 2, NULL),
('before', '/bɪˈfɔː/', 'prep. 在…之前， 在…前面，比…重要
conj. 在…之前，到…为止，以免
adv. 以前', 'I''ve never done this before.
I want this done before Monday.', '', 'new', 'idle', 2, NULL),
('store', '/stɔː/', 'n. 百货商店，备用物，仓库
v. 保存，记忆', 'This building used to be a store for old tires.
I need to get some milk from the grocery store.', '', 'new', 'idle', 2, NULL),
('more', '/ˈmɔː/', 'adv. 更，更多，达到或处于更大的范围或程度，此外，更加
pron. 更多的或附加的人或事物
n. 更多，附加，添加', 'I could no more climb that than fly!
You''re more beautiful than I ever imagined.', '', 'new', 'idle', 2, NULL),
('hungry', '/ˈhʌŋ.ɡɹi/', 'adj. 饥饿的，渴望的，渴望得到，（统称）饥民，荒年的，不毛的', 'My kids go to bed hungry every night because I haven''t got any money.
a hungry soil', '', 'new', 'idle', 2, NULL),
('wire', '/waɪə(ɹ)/', 'n. 金属丝，电线，铁丝网
v. 给…布线，打电报，电汇（款）', 'This election is going to go right to the wire
to pull the wires for office', '', 'new', 'idle', 2, NULL),
('hire', '/haɪə/', 'v. 雇用，临时雇佣，租用
n. 租赁，新雇员', 'The sign offered pedalos on hire.
When my grandfather retired, he had over twenty mechanics in his hire.', '', 'new', 'idle', 2, NULL),
('fire', '/ˈfɑeə(ɹ)/', 'n. 火（灾），炉火，取暖器，火力，激情
v. 射击，解雇，烧制，(引擎)点火，驱动，唤起', 'We sat about the fire singing songs and telling tales.
During hot and dry summers many fires in forests are caused by regardlessly discarded cigarette butts.', '', 'new', 'idle', 2, NULL),
('food', '/fuːd/', '食物', 'The innkeeper brought them food and drink.
Mozart and Bach are food for my soul.', '', 'new', 'idle', 2, NULL),
('moon', '/muːn/', '月亮', 'That''s no moon, you idiot... it''s a space station!
They stayed with their aunt and uncle for many moons.', '', 'new', 'idle', 2, NULL);
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('afternoon', '/ ˌɑːftəˈnuːn /', 'n. 下午，午后', '', '', 'new', 'idle', 2, NULL),
('snowy', '/snəʊi/', '多雪的', 'snowy day
snowy hillside', '', 'new', 'idle', 2, NULL),
('rainy', '/ˈreɪni/', '下雨的', 'Due to the rainy weather, we decided not to play in the park.', '', 'new', 'idle', 2, NULL),
('cloudy', '/ˈklaʊːdɪ/', '多云的', 'a cloudy infrastructure', '', 'new', 'idle', 2, NULL),
('windy', '/ˈwɪndi/', '多风的', 'It was a long and windy night.
They made love in a windy bus shelter.', '', 'new', 'idle', 2, NULL),
('every', '/ˈevri/', 'det. 每个，每，每…之中，充足的
adj. 全部的', '', '第一个音节：ev（闭音节，e 发短音 /e/）
第二个音节：ery（y 在词尾发 /i/）', 'new', 'idle', 2, NULL),
('now', '/naʊ/', 'adv. 现在，如今，立刻，马上，这下，这时，迄今，然而，（语气词）喂，好，哦，喏
conj. 既然，由于', 'Now is the right time.
She is living in the now.', '', 'new', 'idle', 2, NULL),
('police', '[pəˈliːs]', 'n. 警察部门，警方，警察，治安
vt. （警察、军队等）巡查，维护治安，（委员会等）监督，管制', 'Call the police!
thought police', '', 'new', 'idle', 2, NULL),
('driver', '/ˈdraɪ.və(r)/', 'n. 司机，驾驶员，驱动程序，驱动因素', '', '', 'new', 'idle', 2, NULL),
('why', '/waɪ/', 'adv. 为什么，何必，…的原因
conj. （用于从句句首）为什么
int. 哎呀，哟', 'A good article will cover the who, the what, the when, the where, the why and the how.
That''s the reason why I did that.', '', 'new', 'idle', 2, NULL),
('firefighter', '/ˈfaɪə(r)ˌfaɪt.ə(r)/', 'n. <美>消防队员', '', '', 'new', 'idle', 2, NULL),
('toilet', '/ˈtɔɪ.lət/', 'n. 洗手间，坐便器，梳洗', 'Sorry, I was in the toilet.
My toilet backed up. Now the bathroom''s flooded.', '', 'new', 'idle', 2, NULL),
('Chinese', '/ˌtʃaɪˈniːz/', 'n. 中国人，华人，中文，汉语
adj. 中国的，中国人的，中国话的，中文的', '', 'ese：发长元音 /iːz/。
自然拼读小贴士：这是一个标准的“元音+辅音+不发音e”结构（魔法e）。结尾的不发音 e 让前面的元音字母 e 发它本身的字母音（长元音 /iː/），而 s 夹在两个元音之间，发浊辅音 /z/。
类似的词还有：cheese（奶酪）、these（这些）。', 'new', 'idle', 2, NULL),
('child', '/t͡ʃaɪld/', 'n. 儿童，小孩，子女', 'Go easy on him: he is but a child.
My youngest child is forty-three this year.', '在英语自然拼读中，当元音字母 i 后面跟着 ld 或 nd 组合时，i 通常会发它本身的字母音（长元音 /aɪ/）', 'new', 'idle', 2, NULL),
('floor', '/flɔː/', 'n. 地面，地板，楼层，底部，议员席
vt. 铺地板，击败，打倒', 'The room has a wooden floor.
Many sunken ships rest on the ocean floor.', '', 'new', 'idle', 2, NULL),
('sweep', '/swiːp/', 'v. 打扫，拂去，梳（头发），挥动（手臂），席卷，扫过，迅速传播，大模大样地走，彻底删掉，延伸，轻松赢得
n. 打扫，挥动，搜索，扫荡，广泛性，(道路、河流)绵延弯曲的地带', 'Give the front steps a quick sweep to get rid of those fallen leaves.
Bradman attempted a sweep, but in fact top edged the ball to the wicket keeper', '', 'new', 'idle', 2, NULL),
('clean', '/kleːn/', 'adj. 干净的，无污染的，清白的，清新的，公平的，完全的，简洁的
v. 清洗，打扫
adv. 彻底，完全
n. 打扫，清扫', 'This place needs a clean.
Can you clean the windows today?', '', 'new', 'idle', 2, NULL),
('chore', '/tʃɔː/', 'n. 琐事，令人厌烦的任务，家务活', 'Washing dishes is a chore, but we cannot just stop eating.', '', 'new', 'idle', 2, NULL),
('tired', '/taɪəd/', 'adj. 累的，疲劳的，厌倦的，陈旧的
v. （使）疲劳，困倦，厌烦（tire的过去式）', 'I tire of this book.
I''m tired of this', 'ired：发双元音 /aɪ/ 加上卷舌音 /ərd/。
自然拼读小贴士：这是一个非常经典的“元音 + 辅音 + 不发音e”结构（也就是我们常说的“魔法e”或“相对开音节”）。
中间的元音字母 i 发它本身的字母音，也就是长元音 /aɪ/。
结尾的 re 组合发卷舌音 /ərd/。
类似的词还有：fire（火）、hire（雇佣）、wire（电线）。', 'new', 'idle', 2, NULL),
('sky', '/skaɪ/', 'n. 天（空）
vt. 将…击向空中，将…高挂', 'That year, a meteor fell from the sky.
I lay back under a warm Texas sky.', '', 'new', 'idle', 2, NULL);
INSERT INTO words (word, phonetic, definition, example, notes, proficiency, learning_status, user_id, group_id) VALUES
('quiet', '/ˈkwaɪət/', '文静的', '', '', 'new', 'idle', 2, NULL);
