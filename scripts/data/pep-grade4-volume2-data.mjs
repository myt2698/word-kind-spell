const item = (word, definition, examples, split, tags = []) => ({
  word,
  definition,
  example: examples.join("\n"),
  split,
  tags: tags.length ? tags : ["常用词整体拼读"],
});

export const textbookName = "人教pep四下";
export const textbookDescription =
  "义务教育教科书·英语（PEP）四年级下册（2025年版），按教材单元词汇表及正文例句整理";

export const units = [
  {
    name: "Unit 1",
    description: "Class rules",
    entries: [
      item(
        "sorry",
        "对不起",
        ["Sorry, you can't talk in class.", "Sorry, sir."],
        "sor-ry",
        ["or /ɔː/", "辅音+y多音节"]
      ),
      item(
        "hurry up",
        "快点；赶快",
        ["Hurry up! Don't be late for class!", "Hurry up! Let's go."],
        "hur-ry up",
        ["ur", "辅音+y多音节"]
      ),
      item(
        "late",
        "迟到；迟发生",
        ["Don't be late for class.", "I'm sorry I'm late."],
        "late",
        ["VCe a_e /eɪ/"]
      ),
      item(
        "class",
        "课；课程；班；班级",
        ["Sorry, you can't talk in class.", "Don't be late for class."],
        "class",
        ["闭音节 a /æ/"]
      ),
      item(
        "ready",
        "准备好",
        ["OK, sir. I'm ready. Let's go.", "I'm ready. Let's go."],
        "read-y",
        ["辅音+y多音节"]
      ),
      item(
        "rule",
        "规则；规章",
        ["These are our class rules.", "Why do we follow class rules?"],
        "rule",
        ["u_e /uː/"]
      ),
      item(
        "classroom",
        "教室",
        ["Look at our classroom.", "I can clean our classroom."],
        "class-room",
        ["复合词", "oo"]
      ),
      item(
        "turn off",
        "关掉",
        [
          "Turn off the lights after school.",
          "Don't forget to turn off the light.",
        ],
        "turn off",
        ["ur"]
      ),
      item(
        "light",
        "灯；光",
        ["Turn off the lights after school.", "There is one big light."],
        "light",
        ["igh"]
      ),
      item(
        "blackboard",
        "黑板",
        ["I can clean the blackboard.", "Look at the blackboard."],
        "black-board",
        ["复合词", "oa /əʊ/"]
      ),
      item(
        "desk",
        "书桌；办公桌",
        [
          "I can clean my desk after class.",
          "There are many desks and chairs.",
        ],
        "desk",
        ["闭音节 e /e/"]
      ),
      item(
        "chair",
        "椅子",
        [
          "I can put back the desks and chairs.",
          "There are many desks and chairs.",
        ],
        "chair",
        ["ch /tʃ/", "air"]
      ),
      item(
        "tidy",
        "整洁的；使整洁；整理",
        ["Please tidy your room.", "Keep the classroom tidy."],
        "ti-dy",
        ["辅音+y多音节"]
      ),
      item(
        "music",
        "音乐",
        ["We listen to music in class.", "Let's make some music."],
        "mu-sic",
        []
      ),
      item(
        "door",
        "门",
        ["We can see the doors.", "Close the door and clean the doors."],
        "door",
        ["oor"]
      ),
      item(
        "window",
        "窗",
        ["We can see the windows.", "Close the windows and clean the windows."],
        "win-dow",
        ["ow/əʊ/"]
      ),
      item(
        "fan",
        "风扇",
        [
          "I like this room. The floor is green. The chairs are ... and the fans are ...",
          "We can see the fans.",
        ],
        "fan",
        ["闭音节 a /æ/"]
      ),
      item(
        "when",
        "当……时；什么时候",
        ["When can we do this?", "When do we clean the classroom?"],
        "when",
        ["wh /w/", "闭音节 e /e/"]
      ),
      item(
        "understand",
        "懂；理解",
        ["Do you understand?", "Now I understand the class rules."],
        "un-der-stand",
        []
      ),
      item(
        "wall",
        "墙；壁",
        ["There are pictures on the walls.", "Clean the walls after class."],
        "wall",
        ["all"]
      ),
      item(
        "newspaper",
        "报纸",
        [
          "Some of us read newspapers.",
          "Please put the newspaper on the desk.",
        ],
        "news-pa-per",
        ["复合词"]
      ),
      item(
        "hand out",
        "分发",
        ["We hand out the workbooks.", "Please hand out the books."],
        "hand out",
        ["ou/aʊ/"]
      ),
      item(
        "workbook",
        "练习册；作业本",
        ["We hand out the workbooks.", "Put your workbook on the desk."],
        "work-book",
        ["复合词", "wor /wɜː/", "ook /ʊ/"]
      ),
    ],
  },
  {
    name: "Unit 2",
    description: "Family rules",
    entries: [
      item(
        "watch",
        "看",
        [
          "Mum, can I watch TV?",
          "Don't watch TV before you finish your homework.",
        ],
        "watch",
        ["tch /tʃ/"]
      ),
      item(
        "TV",
        "电视",
        [
          "Mum, can I watch TV?",
          "Don't watch TV before you finish your homework.",
        ],
        "T-V",
        ["字母名称（缩写）"]
      ),
      item(
        "homework",
        "家庭作业",
        [
          "Do your homework first.",
          "Don't watch TV before you finish your homework.",
        ],
        "home-work",
        ["复合词", "wor /wɜː/"]
      ),
      item(
        "first",
        "首先；首次；第一",
        ["Do your homework first.", "First, finish your homework."],
        "first",
        ["ir /ɜː/"]
      ),
      item(
        "wet",
        "湿的；未干的",
        ["The floor is wet.", "Be careful. The floor is wet."],
        "wet",
        ["闭音节 e /e/"]
      ),
      item(
        "run",
        "跑；奔跑",
        ["Don't run on the wet floor.", "We can run outside."],
        "run",
        ["闭音节 u /ʌ/"]
      ),
      item(
        "living room",
        "客厅；起居室",
        ["Mum is playing in the living room.", "The living room is clean."],
        "liv-ing room",
        ["ing", "oo"]
      ),
      item(
        "safe",
        "安全的",
        [
          "These rules can keep me safe.",
          "Following family rules keeps us safe.",
        ],
        "safe",
        ["VCe a_e /eɪ/"]
      ),
      item(
        "word",
        "言语；单词；字",
        ["Please read the words.", "Write one rule you know."],
        "word",
        ["wor /wɜː/"]
      ),
      item(
        "wash",
        "洗",
        ["Wash my hands.", "I wash my hands before dinner."],
        "wash",
        ["sh /ʃ/"]
      ),
      item(
        "helpful",
        "有帮助的；有用的",
        ["Family rules are helpful.", "These rules are helpful."],
        "help-ful",
        ["-ful /fl/"]
      ),
      item(
        "loud",
        "说话太大声的；吵闹的",
        ["Don't be loud.", "Don't talk loud in the study."],
        "loud",
        ["ou/aʊ/"]
      ),
      item(
        "sleep",
        "睡觉",
        ["I sleep in the bedroom.", "Don't sleep too late."],
        "sleep",
        ["ee"]
      ),
      item(
        "bedroom",
        "卧室",
        ["John sleeps in the bedroom.", "I tidy my bedroom."],
        "bed-room",
        ["复合词", "oo"]
      ),
      item(
        "kitchen",
        "厨房",
        ["She is in the kitchen.", "We eat dinner in the kitchen."],
        "kitch-en",
        ["tch /tʃ/"]
      ),
      item(
        "study",
        "书房",
        ["Dad is reading in the study.", "Don't talk loud in the study."],
        "stud-y",
        ["辅音+y多音节"]
      ),
      item(
        "bathroom",
        "浴室；洗手间",
        ["The bathroom is clean.", "Wash your hands in the bathroom."],
        "bath-room",
        ["th /θ/", "复合词", "oo"]
      ),
      item(
        "think",
        "想；思考",
        ["What do you think?", "Think about your family rules."],
        "think",
        ["th /θ/", "nk /ŋk/"]
      ),
      item(
        "work",
        "花费时间和精力；做（某事）；工作",
        ["The robot does a lot of work.", "These family rules work well."],
        "work",
        ["wor /wɜː/"]
      ),
      item(
        "hard",
        "努力地；费力地",
        ["The robot works hard.", "Mum and Dad work hard."],
        "hard",
        ["ar/ɑː/"]
      ),
      item(
        "follow",
        "遵循；听从",
        ["Why do we follow family rules?", "I can follow family rules."],
        "fol-low",
        ["ow/əʊ/"]
      ),
      item(
        "feel",
        "觉得；感到",
        ["These rules make me feel safe.", "How do you feel?"],
        "feel",
        ["ee"]
      ),
    ],
  },
  {
    name: "Unit 3",
    description: "Time for school",
    entries: [
      item(
        "over",
        "结束（的）",
        ["School is over.", "Breakfast is over."],
        "o-ver",
        ["o 开音节 /əʊ/"]
      ),
      item(
        "kid",
        "小孩",
        [
          "It's 8 o'clock. It's time for kids to go to school.",
          "The kids are ready for school.",
        ],
        "kid",
        ["闭音节 i /ɪ/"]
      ),
      item(
        "dinner",
        "（中午或晚上吃的）正餐",
        ["It's 6 o'clock. It's time for dinner.", "Dinner is ready."],
        "din-ner",
        ["双写辅音，保护短元音"]
      ),
      item(
        "art",
        "美术；艺术",
        ["It's time for art class.", "We have an art class at 3:00."],
        "art",
        ["ar/ɑː/"]
      ),
      item(
        "lunch",
        "午餐",
        ["It's time for lunch.", "It's 12:00. It's time for lunch."],
        "lunch",
        ["闭音节 u /ʌ/", "ch /tʃ/"]
      ),
      item(
        "maths",
        "数学",
        ["It's time for maths class.", "We have maths at school."],
        "maths",
        ["th /θ/"]
      ),
      item(
        "get up",
        "起床",
        ["It's 7 o'clock. It's time to get up.", "I get up at 7:00."],
        "get up",
        ["闭音节 e /e/"]
      ),
      item(
        "go to school",
        "上学",
        ["It's time to go to school.", "I go to school at 8:00."],
        "go to school",
        ["oo"]
      ),
      item(
        "go home",
        "回家",
        ["It's time to go home.", "I go home at 5:30."],
        "go home",
        ["VCe o_e /əʊ/"]
      ),
      item(
        "go to bed",
        "上床睡觉",
        ["It's time to go to bed.", "I go to bed at 9:00."],
        "go to bed",
        ["闭音节 e /e/"]
      ),
      item(
        "want",
        "想要",
        ["What do you want to do this weekend?", "I want to play football."],
        "want",
        []
      ),
      item(
        "clock",
        "时钟",
        ["What time is it on the clock?", "It's 8 o'clock."],
        "clock",
        ["闭音节 o /ɒ/", "ck /k/"]
      ),
      item(
        "just",
        "只是；仅仅；正要",
        ["I'm just on time.", "It's just 8 o'clock."],
        "just",
        ["闭音节 u /ʌ/"]
      ),
      item(
        "minute",
        "分钟",
        [
          "It's nine thirty-one. I'm just one minute late.",
          "Wait a minute, please.",
        ],
        "min-ute",
        []
      ),
    ],
  },
  {
    name: "Unit 4",
    description: "Going shopping",
    entries: [
      item(
        "trousers",
        "裤子",
        ["Mum, can I buy a new pair of trousers?", "Those trousers are nice."],
        "trou-sers",
        ["ou/aʊ/"]
      ),
      item(
        "pair",
        "（由连在一起的相似两部分构成的）一条，一副",
        ["Can I buy a new pair of trousers?", "I like this pair."],
        "pair",
        ["air"]
      ),
      item(
        "clothes",
        "衣服；服装",
        ["We need some new clothes.", "Choose the clothes you need."],
        "clothes",
        ["o_e /əʊ/"]
      ),
      item(
        "those",
        "（指较远的人或事物）那些",
        ["Those are expensive.", "I like those shorts."],
        "those",
        ["th /ð/", "VCe o_e /əʊ/"]
      ),
      item(
        "shorts",
        "短裤",
        [
          "My skirt is too small. I need a new one. Or shorts.",
          "I like those shorts.",
        ],
        "shorts",
        ["or /ɔː/", "sh /ʃ/"]
      ),
      item(
        "jacket",
        "夹克衫；短上衣",
        ["What do you think of the jacket?", "I like the jacket."],
        "jack-et",
        ["闭音节 a /æ/", "ck /k/"]
      ),
      item(
        "skirt",
        "裙子",
        ["My skirt is too small.", "Look at the blue skirt."],
        "skirt",
        ["ir /ɜː/"]
      ),
      item(
        "dear",
        "亲爱的",
        ["Dear Mike, happy shopping!", "Dear Mum, I like this jacket."],
        "dear",
        ["ear /ɪə/"]
      ),
      item(
        "expensive",
        "昂贵的；价格高的",
        ["It's expensive.", "Those shoes are too expensive."],
        "ex-pen-sive",
        ["i_e /ɪ/ 特例"]
      ),
      item(
        "take",
        "买下",
        ["OK. Let's take it.", "We'll take the blue shorts."],
        "take",
        ["VCe a_e /eɪ/"]
      ),
      item(
        "cheap",
        "便宜的",
        ["They're cheap.", "The sunglasses are cheap."],
        "cheap",
        ["ch /tʃ/", "ea/iː/"]
      ),
      item(
        "shoe",
        "鞋",
        ["The shoes are beautiful.", "How much are the shoes?"],
        "shoe",
        ["sh /ʃ/", "oe /uː/"]
      ),
      item(
        "beautiful",
        "美丽的",
        ["They're beautiful.", "The blue shorts are beautiful."],
        "beau-ti-ful",
        ["-ful /fl/"]
      ),
      item("hat", "帽子", ["I like that hat.", "How much is the hat?"], "hat", [
        "闭音节 a /æ/",
      ]),
      item(
        "sunglasses",
        "太阳镜；墨镜",
        ["Do you like the sunglasses?", "The sunglasses are cheap."],
        "sun-glass-es",
        ["复合词"]
      ),
      item(
        "free",
        "免费的",
        ["These things are free.", "Is the hat free?"],
        "free",
        ["ee"]
      ),
      item(
        "large",
        "（服装、食物、日用品等）大型号的",
        ["Do you have a large size?", "This shirt is large."],
        "large",
        ["ar/ɑː/"]
      ),
      item(
        "size",
        "尺码；号",
        ["What size do you need?", "I need a large size."],
        "size",
        ["i_e /aɪ/"]
      ),
      item(
        "list",
        "清单；目录",
        ["Look at your shopping list.", "Make a shopping list."],
        "list",
        ["闭音节 i /ɪ/"]
      ),
      item(
        "try on",
        "试穿",
        ["Can I try it on?", "Try on the blue shirt."],
        "try on",
        ["辅音+y 单音节 /aɪ/"]
      ),
      item(
        "any",
        "任何的；任一的",
        ["Do you have any shoes?", "You can choose any colour."],
        "an-y",
        ["y /i/ 特例"]
      ),
    ],
  },
  {
    name: "Unit 5",
    description: "Farms and us",
    entries: [
      item("cow", "奶牛", ["I have two cows.", "Cows give us milk."], "cow", [
        "ow/aʊ/",
      ]),
      item(
        "horse",
        "马",
        ["I have two horses.", "Horses live on the farm."],
        "horse",
        ["or /ɔː/"]
      ),
      item(
        "sheep",
        "羊；绵羊",
        [
          "I have a lot of animals: cows, horses, sheep, pigs and chickens.",
          "These are sheep.",
        ],
        "sheep",
        ["sh /ʃ/", "ee"]
      ),
      item("pig", "猪", ["I have ten pigs.", "Those are pigs."], "pig", [
        "闭音节 i /ɪ/",
      ]),
      item(
        "chicken",
        "鸡；鸡肉",
        ["I have a lot of chickens.", "These are chickens."],
        "chick-en",
        ["ch /tʃ/", "ck /k/"]
      ),
      item(
        "tomato",
        "西红柿",
        ["They're tomatoes.", "We grow tomatoes on the farm."],
        "to-ma-to",
        ["o 开音节 /əʊ/"]
      ),
      item(
        "bee",
        "蜜蜂",
        ["They're bees. Bees are good for plants.", "Bees help plants grow."],
        "bee",
        ["ee"]
      ),
      item(
        "mouse",
        "老鼠（复数 mice）",
        ["What are those? They're mice.", "A mouse lives on the farm."],
        "mouse",
        ["ou/aʊ/", "s /s/"]
      ),
      item(
        "carrot",
        "胡萝卜",
        ["Look at the carrots.", "We grow carrots on the farm."],
        "car-rot",
        ["闭音节 a /æ/"]
      ),
      item(
        "potato",
        "土豆",
        ["They're potatoes.", "We grow potatoes on the farm."],
        "po-ta-to",
        ["o 开音节 /əʊ/"]
      ),
      item(
        "green bean",
        "青刀豆；四季豆",
        [
          "There are green beans and potatoes.",
          "We grow green beans on the farm.",
        ],
        "green bean",
        ["ee", "ea/iː/"]
      ),
      item(
        "can",
        "（盛食品或饮料的）金属罐",
        ["This is a can.", "Put the food in a can."],
        "can",
        ["闭音节 a /æ/"]
      ),
      item(
        "a box of",
        "一盒；一箱（东西）",
        ["There is a box of eggs.", "We need a box of tomatoes."],
        "a box of",
        ["闭音节 o /ɒ/"]
      ),
    ],
  },
  {
    name: "Unit 6",
    description: "From farm to table",
    entries: [
      item(
        "feed",
        "给（人或动物）食物；饲养",
        ["Let's feed the pigs.", "Farmers feed the cows."],
        "feed",
        ["ee"]
      ),
      item(
        "pass",
        "给；递",
        ["Can you please pass me the vegetables?", "Please pass the bowl."],
        "pass",
        ["闭音节 a /æ/"]
      ),
      item(
        "pick",
        "采；摘",
        ["They pick carrots.", "Let's pick some vegetables."],
        "pick",
        ["闭音节 i /ɪ/", "ck /k/"]
      ),
      item("milk", "挤奶", ["They milk cows.", "Let's milk the cow."], "milk", [
        "闭音节 i /ɪ/",
      ]),
      item(
        "knife",
        "刀",
        [
          "Let's set the table. I can pass you the fork.",
          "Be careful with the knife.",
        ],
        "knife",
        ["i_e /aɪ/", "kn /n/"]
      ),
      item(
        "fork",
        "餐叉",
        ["Can you pass me the fork?", "Put the fork on the table."],
        "fork",
        ["or /ɔː/"]
      ),
      item(
        "chopstick",
        "筷子（常用复数）",
        ["Let's use chopsticks.", "Put the chopsticks on the table."],
        "chop-stick",
        ["ch /tʃ/", "复合词", "ck /k/"]
      ),
      item(
        "waste",
        "浪费；废品",
        ["Don't waste food.", "We should not waste food."],
        "waste",
        ["VCe a_e /eɪ/"]
      ),
      item(
        "food",
        "菜肴；食物",
        ["The food is delicious!", "Don't waste food."],
        "food",
        ["oo"]
      ),
      item(
        "delicious",
        "美味的；可口的",
        ["The food is delicious!", "This salad is delicious."],
        "de-li-cious",
        ["cious /ʃəs/"]
      ),
      item(
        "clear the table",
        "收拾餐桌",
        ["Can you clear the table?", "Let's clear the table after dinner."],
        "clear the ta-ble",
        ["ear /ɪə/", "辅音-le"]
      ),
      item(
        "set the table",
        "摆放餐具",
        ["Let's set the table.", "Can you set the table?"],
        "set the ta-ble",
        ["闭音节 e /e/", "辅音-le"]
      ),
      item(
        "bowl",
        "碗",
        ["Pass me the bowl, please.", "Put the salad in a bowl."],
        "bowl",
        ["ow/əʊ/"]
      ),
      item(
        "spoon",
        "勺；匙；调羹",
        ["Can you pass me the spoon?", "Put the spoon on the table."],
        "spoon",
        ["oo"]
      ),
      item(
        "supermarket",
        "超市",
        ["We buy food from a supermarket.", "Mum goes to the supermarket."],
        "su-per-mar-ket",
        ["复合词", "ar/ɑː/"]
      ),
      item(
        "herself",
        "（用作女性的反身代词）她自己；自己",
        ["She can do it herself.", "Mum makes the salad herself."],
        "her-self",
        ["复合词"]
      ),
      item(
        "week",
        "周；星期",
        [
          "Every week, Mike's family goes to a park.",
          "We visit the farm every week.",
        ],
        "week",
        ["ee"]
      ),
      item(
        "salad",
        "蔬菜沙拉",
        ["Let's make a salad.", "This salad is delicious."],
        "sal-ad",
        ["闭音节 a /æ/"]
      ),
    ],
  },
];

export const tagDescriptions = {
  "字母名称（缩写）": "缩写词按字母名称逐个读，例如 TV 读作 /ˌtiː ˈviː/。",
  "闭音节 a /æ/": "重读闭音节中的 a 通常读短元音 /æ/。",
  "闭音节 e /e/": "重读闭音节中的 e 通常读短元音 /e/。",
  "闭音节 i /ɪ/": "重读闭音节中的 i 通常读短元音 /ɪ/。",
  "闭音节 o /ɒ/": "英式英语中，重读闭音节里的 o 通常读 /ɒ/。",
  "闭音节 u /ʌ/": "重读闭音节中的 u 通常读短元音 /ʌ/。",
  "VCe a_e /eɪ/": "a_e 结构中末尾 e 不发音，使 a 读 /eɪ/。",
  "i_e /aɪ/": "i_e 结构中末尾 e 不发音，使 i 读 /aɪ/。",
  "i_e /ɪ/ 特例":
    "部分多音节词中的 i_e 不按魔法 e 规则读 /aɪ/，需要结合词音记忆。",
  "VCe o_e /əʊ/": "o_e 结构中末尾 e 不发音，使 o 读 /əʊ/。",
  "o_e /əʊ/": "词中的 o_e 常读 /əʊ/。",
  "u_e /uː/": "u_e 结构中末尾 e 不发音，u 常读 /uː/。",
  "o 开音节 /əʊ/": "开音节中的 o 通常读字母本音 /əʊ/。",
  "ch /tʃ/": "ch 通常合起来读辅音 /tʃ/。",
  "tch /tʃ/": "短元音后的 tch 通常合起来读 /tʃ/。",
  "sh /ʃ/": "sh 通常合起来读辅音 /ʃ/。",
  "th /θ/": "th 在 think、maths 等词中读清辅音 /θ/。",
  "th /ð/": "th 在 those 等常用词中读浊辅音 /ð/。",
  "wh /w/": "wh 在 when 等词首通常读 /w/。",
  "ck /k/": "短元音后的词尾 ck 合起来读 /k/。",
  "nk /ŋk/": "nk 通常对应连续辅音 /ŋk/。",
  "kn /n/": "词首 kn 中 k 不发音，n 读 /n/。",
  igh: "igh 固定读 /aɪ/，其中 gh 不发音。",
  ee: "ee 通常读长元音 /iː/。",
  "ea/iː/": "ea 在 bean、cheap 等词中读 /iː/。",
  "ear /ɪə/": "ear 在 dear、clear 等词中常读 /ɪə/。",
  air: "air 在 chair、pair 等词中通常读 /eə/。",
  oo: "oo 在 room、food 等词中通常读 /uː/。",
  oor: "oor 在 door 等词中通常整体读 /ɔː/。",
  "ook /ʊ/": "oo 在 book 等词中读短元音 /ʊ/。",
  "ou/aʊ/": "ou 在 loud、mouse 等词中读 /aʊ/。",
  "ow/aʊ/": "ow 在 cow 等词中读 /aʊ/。",
  "ow/əʊ/": "ow 在 window、follow 等词中读 /əʊ/。",
  "oa /əʊ/": "oa 通常读 /əʊ/。",
  "oe /uː/": "oe 在 shoe 中读 /uː/。",
  "or /ɔː/": "or 在重读音节中通常读 /ɔː/。",
  "ar/ɑː/": "ar 在重读音节中通常读 /ɑː/。",
  "ir /ɜː/": "ir 在重读音节中通常读 /ɜː/。",
  ur: "ur 在重读音节中通常读 /ɜː/。",
  "wor /wɜː/": "wor 在 work、word 等词中通常读 /wɜː/。",
  all: "all 通常整体读 /ɔːl/。",
  "辅音+y多音节": "多音节词末尾的辅音字母加 y，y 通常读 /i/。",
  "辅音+y 单音节 /aɪ/": "单音节词末尾的辅音字母加 y，y 通常读 /aɪ/。",
  "y /i/ 特例": "any 中的 y 读 /i/，a 的读音也需按常用词整体记忆。",
  "双写辅音，保护短元音": "双写辅音通常提示前一个重读音节保持短元音。",
  ing: "词尾 ing 通常读 /ɪŋ/。",
  "-ful /fl/": "非重读词尾 -ful 常弱读为 /fl/ 或 /fəl/。",
  "辅音-le": "词尾辅音字母加 le 常构成稳定的辅音-le 音节。",
  复合词: "复合词优先在两个有独立意义的小词之间拆分。",
  "cious /ʃəs/": "非重读词尾 cious 通常读 /ʃəs/。",
  "s /s/": "清辅音后或部分词中，字母 s 读清辅音 /s/。",
  常用词整体拼读:
    "没有适合单独强调的新字母组合时，按音节拆分并结合完整词音拼读。",
};
