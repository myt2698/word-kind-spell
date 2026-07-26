import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const apply = process.argv.includes("--apply");
const databaseUrl = process.env.DATABASE_URL;
const catalogOwnerId = Number(process.env.CATALOG_OWNER_USER_ID);
const textbookName = "人教pep四上";

if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (!Number.isInteger(catalogOwnerId) || catalogOwnerId <= 0) {
  throw new Error("CATALOG_OWNER_USER_ID must be a positive integer");
}

const tagDescriptions = {
  "字母名称（缩写）":
    "缩写词按字母名称逐个读，不按普通单词拼读；例如 PE 读作 /ˌpiː ˈiː/。",
  "闭音节 a /æ/":
    "闭音节中，一个 a 后面由辅音收尾时通常发短元音 /æ/，如 bad、basket、factory。",
  "闭音节 e /e/":
    "闭音节中，一个 e 后面由辅音收尾时通常发短元音 /e/，如 best、tell、help。",
  "闭音节 i /ɪ/":
    "闭音节中，一个 i 后面由辅音收尾时通常发短元音 /ɪ/，如 his、film、swim。",
  "闭音节 o /ɒ/":
    "英式英语中，闭音节里的 o 通常发短元音 /ɒ/，如 job、hot、sock。",
  "闭音节 u /ʌ/":
    "闭音节中，一个 u 后面由辅音收尾时通常发短元音 /ʌ/，如 fun、sun。",
  "u /ɪ/ 特例":
    "busy 中的字母 u 不按常见闭音节规则发 /ʌ/，而发 /ɪ/，需要作为常用特例记忆。",
  "o /ʌ/ 特例":
    "glove 等少数词中的字母 o 发 /ʌ/，不是常见的 /ɒ/ 或 /əʊ/，需要按词族记忆。",
  "VCe a_e /eɪ/":
    "a_e 是 VCe（元音—辅音—不发音 e）结构：末尾 e 不发音，使 a 发 /eɪ/，如 game、place。",
  "i_e /aɪ/":
    "i_e 是 VCe（元音—辅音—不发音 e）结构：末尾 e 不发音，使 i 发 /aɪ/，如 mine、kite。",
  "VCe o_e /əʊ/":
    "o_e 是 VCe 结构：末尾 e 不发音，使 o 发 /əʊ/，如 close、closed。",
  "o_e /uː/ 特例":
    "whose 中的 ose 不按常见 o_e 读 /əʊ/，而读 /uːz/；wh 同时读 /h/，需整体记忆。",
  "ch /tʃ/":
    "ch 通常合起来表示一个辅音 /tʃ/，如 child、Chinese、which。",
  "sh /ʃ/":
    "sh 是辅音二合字母，合起来发 /ʃ/，如 shirt、T-shirt。",
  "th /ð/":
    "th 在 there、their、weather、then 等常用词中发浊辅音 /ð/，发音时舌尖轻触上下齿。",
  "wh /w/":
    "wh 在 which、why 等词首通常发 /w/；who、whose 是发 /h/ 的常见特例。",
  "wh /h/":
    "wh 在 who、whose 等少数词中发 /h/，其中 w 不发音。",
  "ph":
    "ph 是辅音二合字母，通常发 /f/，如 photo。",
  "eo /iː/":
    "people 中的 eo 合起来发长元音 /iː/；这是较少见的拼写，需要结合整个单词记忆。",
  "ng /ŋ/":
    "ng 通常合起来发鼻音 /ŋ/，如 spring；气流主要从鼻腔通过。",
  "ong/ɒŋ/":
    "ong 在 long、song、strong 等词中读 /ɒŋ/：o 发英式短元音 /ɒ/，ng 合起来表示鼻音 /ŋ/。",
  "ee":
    "ee 是常见元音组合，通常发长元音 /iː/，如 sweep、see。",
  "ea/iː/":
    "ea 在 clean、read、speak、season、leaf 等词中发长元音 /iː/。",
  "ea/e/":
    "ea 在 weather、sweater、bread 等词中例外地发短元音 /e/。",
  "ea /ɪə/":
    "idea 末尾的 ea 在英式英语中连读为 /ɪə/，与前面的音节分开。",
  "oo":
    "oo 在 room、cool 等词中发长元音 /uː/。",
  "oot/ood/ook":
    "oo 在 cook、foot、football、book 等常用词中发短元音 /ʊ/。",
  "ou/aʊ/":
    "ou 在 playground、cloudy 等词中可发双元音 /aʊ/。",
  "ow/aʊ/":
    "ow 在 now 等词中发双元音 /aʊ/。",
  "ow/əʊ/":
    "ow 在 snow、snowy、tomorrow 等词中常发 /əʊ/。",
  "oi":
    "oi 是元音组合，通常发双元音 /ɔɪ/，如 toilet。",
  "ai":
    "ai 是元音组合，通常发 /eɪ/，如 rain、rainy。",
  "ay":
    "ay 常出现在单词或音节末尾，发 /eɪ/，如 play、always。",
  "oa /əʊ/":
    "oa 是常见元音组合，通常发 /əʊ/，如 coat、boat。",
  "air":
    "air 在 hair 等词中，英式英语通常发 /eə/，美式英语通常带卷舌音。",
  "ear /eə/":
    "ear 在 wear 等词中，英式英语通常发 /eə/，美式英语通常读作 /er/。",
  "ere/eir /eə/":
    "ere、eir 在 there、their 中，英式英语通常发 /eə/，美式英语通常带卷舌音。",
  "ar/ɑː/":
    "ar 在重读音节中，英式英语通常发 /ɑː/，如 park、farmer。",
  "or/ɔː/":
    "or 在重读音节中，英式英语通常发 /ɔː/，如 sport、story。",
  "or 在非重读音节/ər/":
    "or 在 doctor 等词的非重读音节中通常弱读为 /ə/，美式英语常带 /r/。",
  "ir /ɜː/":
    "ir 在重读音节中，英式英语通常发 /ɜː/，如 shirt。",
  "ur":
    "ur 在 nurse 等词中，英式英语通常发 /ɜː/，美式英语通常带卷舌音。",
  "ore":
    "ore 在 chore 等词中，英式英语通常发 /ɔː/，美式英语通常带卷舌音。",
  "oor":
    "oor 在 floor 等词中，英式英语通常发 /ɔː/，美式英语通常带卷舌音。",
  "al":
    "al 在 walk、also 等词中常发 /ɔː/，其中 l 可能不单独发音或与元音融合。",
  "all":
    "all 通常发 /ɔːl/，如 fall、football、basketball。",
  "old":
    "old 中的 o 常发 /əʊ/，整体韵尾读作 /əʊld/。",
  "war /wɔː/":
    "war 在 warm 等词中，英式英语通常发 /wɔː/，字母 r 不单独卷舌。",
  "wor /wɜː/":
    "wor 在 work、worker 中，英式英语通常发 /wɜː/，美式英语带卷舌音。",
  "ire":
    "ire 在 fire、tired 等词中通常发 /aɪə/，美式英语常读作 /aɪr/。",
  "igh":
    "igh 是元音组合，固定发 /aɪ/，其中 gh 不发音，如 fight、firefighter。",
  "i+ld/nd":
    "在 child、kind 等常用词中，i 位于 ld 或 nd 前时常发 /aɪ/。",
  "qu":
    "qu 通常表示辅音连缀 /kw/，如 quiet。",
  "ese":
    "词尾 ese 通常发 /iːz/，且重音常落在这一音节，如 Chinese。",
  "pl":
    "pl 是辅音连缀，p 和 l 各自保留发音并快速连读，如 play、place。",
  "辅+y多音节":
    "多音节词末尾的“辅音字母 + y”中，y 通常发 /i/，如 busy、story、windy。",
  "辅+y 单音节":
    "单音节词末尾的 y 通常发 /aɪ/，如 why、fly。",
  "双写辅音，保护短元音":
    "两个相同辅音通常提示前一个重读音节保持短元音；拆音节时常从双辅音中间分开，如 sun-ny、sum-mer。",
  "ple":
    "词尾 ple 是稳定的辅音-le 音节，通常读作 /pl/ 或 /pəl/，如 people。",
  "-ful /fl/":
    "非重读词尾 -ful 常弱读为 /fl/ 或 /fəl/，如 helpful。",
  "复合词":
    "复合词优先在两个有独立意义的小词之间拆分，如 foot-ball、play-ground、snow-man。",
  "弱读 of /əv/":
    "介词 of 在短语中通常弱读为 /əv/；语速快时元音会进一步弱化。",
  "Ms /mɪz/":
    "称谓 Ms 读作 /mɪz/，末尾字母 s 发浊辅音 /z/。",
  "uy /aɪ/":
    "uy 是较少见的组合，在 buy、guy 中发 /aɪ/。",
  "au /ɔː/":
    "au 在 autumn 等词中，英式英语通常发 /ɔː/。",
  "ey /i/":
    "非重读词尾 ey 常发 /i/，如 Sydney。",
  "o 开音节 /əʊ/":
    "开音节中的 o 常发字母本音 /əʊ/，如 photo、over。",
  "our/ə/":
    "favourite 的 our 位于非重读部分，在英式英语中弱读为 /ə/；美式英语通常带卷舌音。",
  "ice 在多音节词中 /iːs/":
    "police 中的 ice 不按单音节 VCe 规则读 /aɪs/，而读 /iːs/，且重音落在第二音节。",
  "ask 词族 a /ɑː/":
    "basket 等 ask 词族在英式英语中常把 a 读作 /ɑː/；美式英语通常读 /æ/。",
};

const entries = [
  // Unit 1
  { units: ["Unit 1"], word: "PE", phonetic: "/ˌpiː ˈiː/", definition: "体育（课）", example: "He's a PE teacher.", split: "P-E（按字母名称读）", tags: ["字母名称（缩写）"] },
  { units: ["Unit 1"], word: "job", phonetic: "/dʒɒb/", definition: "工作；职业", example: "What's your mother's job?", split: "job（1个音节）", tags: ["闭音节 o /ɒ/"] },
  { units: ["Unit 1"], word: "doctor", phonetic: "/ˈdɒktə(r)/", definition: "医生", example: "She's a doctor.", split: "doc-tor（2个音节）", tags: ["闭音节 o /ɒ/", "or 在非重读音节/ər/"] },
  { units: ["Unit 1"], word: "farmer", phonetic: "/ˈfɑːmə(r)/", definition: "农场主；农民", example: "farmer", split: "farm-er（2个音节）", tags: ["ar/ɑː/"] },
  { units: ["Unit 1"], word: "nurse", phonetic: "/nɜːs/", definition: "护士", example: "She's a nurse. She helps people.", split: "nurse（1个音节）", tags: ["ur"] },
  { units: ["Unit 1"], word: "office worker", phonetic: "/ˈɒfɪs ˈwɜːkə(r)/", definition: "公司职员", example: "office worker", split: "of-fice work-er（复合名词）", tags: ["闭音节 o /ɒ/", "wor /wɜː/", "复合词"] },
  { units: ["Unit 1"], word: "factory worker", phonetic: "/ˈfæktri ˈwɜːkə(r)/", definition: "工厂工人", example: "He's a factory worker.", split: "fac-to-ry work-er（复合名词）", tags: ["闭音节 a /æ/", "辅+y多音节", "wor /wɜː/", "复合词"] },
  { units: ["Unit 1"], word: "busy", phonetic: "/ˈbɪzi/", definition: "忙碌的", example: "Mum and Dad are busy and tired.", split: "bus-y（2个音节）", tags: ["u /ɪ/ 特例", "辅+y多音节"] },
  { units: ["Unit 1"], word: "tired", phonetic: "/ˈtaɪəd/", definition: "疲倦的", example: "Mum and Dad are busy and tired.", split: "tired（常连读为1个音节，慢读可分2拍）", tags: ["ire"] },
  { units: ["Unit 1"], word: "chore", phonetic: "/tʃɔː(r)/", definition: "家庭杂务", example: "We can do some chores.", split: "chore（1个音节）", tags: ["ch /tʃ/", "ore"] },
  { units: ["Unit 1", "Unit 4"], word: "cook", phonetic: "/kʊk/", definition: "烹饪；煮；厨师", example: "I can cook.\nA cook is cooking in the park.", split: "cook（1个音节）", tags: ["oot/ood/ook"] },
  { units: ["Unit 1"], word: "clean", phonetic: "/kliːn/", definition: "打扫；干净的", example: "I can clean the room.", split: "clean（1个音节）", tags: ["ea/iː/"] },
  { units: ["Unit 1"], word: "room", phonetic: "/ruːm/", definition: "房间", example: "I can clean the room.", split: "room（1个音节）", tags: ["oo"] },
  { units: ["Unit 1"], word: "look after", phonetic: "/lʊk ˈɑːftə(r)/", definition: "照顾", example: "I look after my sister.", split: "look af-ter（短语）", tags: ["oot/ood/ook"] },
  { units: ["Unit 1"], word: "sweep", phonetic: "/swiːp/", definition: "扫", example: "We sweep the floor.", split: "sweep（1个音节）", tags: ["ee"] },
  { units: ["Unit 1"], word: "floor", phonetic: "/flɔː(r)/", definition: "地板；地面", example: "We sweep the floor.", split: "floor（1个音节）", tags: ["oor"] },
  { units: ["Unit 1"], word: "together", phonetic: "/təˈɡeðə(r)/", definition: "在一起；共同", example: "We cook together. We are happy together.", split: "to-geth-er（3个音节）", tags: ["th /ð/"] },
  { units: ["Unit 1"], word: "people", phonetic: "/ˈpiːpl/", definition: "人；人们", example: "People speak Chinese in China.", split: "peo-ple（2个音节）", tags: ["eo /iː/", "ple"] },
  { units: ["Unit 1"], word: "child", phonetic: "/tʃaɪld/", definition: "儿童；小孩（复数 children）", example: "You are still a child. What can you do?", split: "child（1个音节）", tags: ["ch /tʃ/", "i+ld/nd"] },
  { units: ["Unit 1"], word: "helpful", phonetic: "/ˈhelpfl/", definition: "有帮助的；有用的", example: "They are helpful!", split: "help-ful（2个音节）", tags: ["闭音节 e /e/", "-ful /fl/"] },

  // Unit 2
  { units: ["Unit 2"], word: "his", phonetic: "/hɪz/", definition: "他的", example: "What's his name? His name is Zhang Peng.", split: "his（1个音节）", tags: ["闭音节 i /ɪ/"] },
  { units: ["Unit 2"], word: "strong", phonetic: "/strɒŋ/", definition: "强壮的", example: "Look, he is tall and strong.", split: "strong（1个音节）", tags: ["ong/ɒŋ/"] },
  { units: ["Unit 2"], word: "hair", phonetic: "/heə(r)/", definition: "头发", example: "He has nice short hair too.", split: "hair（1个音节）", tags: ["air"] },
  { units: ["Unit 2"], word: "also", phonetic: "/ˈɔːlsəʊ/", definition: "也", example: "He is also kind. He often helps me.", split: "al-so（2个音节）", tags: ["al", "o 开音节 /əʊ/"] },
  { units: ["Unit 2"], word: "kind", phonetic: "/kaɪnd/", definition: "友好的", example: "She is quiet and kind.", split: "kind（1个音节）", tags: ["i+ld/nd"] },
  { units: ["Unit 2"], word: "quiet", phonetic: "/ˈkwaɪət/", definition: "文静的", example: "She is quiet and kind.", split: "qui-et（2个音节）", tags: ["qu"] },
  { units: ["Unit 2"], word: "best", phonetic: "/best/", definition: "最好的", example: "Who's your best friend?", split: "best（1个音节）", tags: ["闭音节 e /e/"] },
  { units: ["Unit 2"], word: "read", phonetic: "/riːd/", definition: "阅读", example: "He often reads books with me.", split: "read（1个音节）", tags: ["ea/iː/"] },
  { units: ["Unit 2"], word: "Chinese", phonetic: "/ˌtʃaɪˈniːz/", definition: "中文；中国人；中国的", example: "He helps me with Chinese.", split: "Chi-nese（2个音节）", tags: ["ch /tʃ/", "ese"] },
  { units: ["Unit 2"], word: "play", phonetic: "/pleɪ/", definition: "玩耍", example: "We play games together.", split: "play（1个音节）", tags: ["pl", "ay"] },
  { units: ["Unit 2"], word: "game", phonetic: "/ɡeɪm/", definition: "游戏", example: "We play games together.", split: "game（1个音节）", tags: ["VCe a_e /eɪ/"] },
  { units: ["Unit 2"], word: "football", phonetic: "/ˈfʊtbɔːl/", definition: "足球运动", example: "I often play football and basketball.", split: "foot-ball（复合词，2个音节）", tags: ["oot/ood/ook", "all", "复合词"] },
  { units: ["Unit 2"], word: "basketball", phonetic: "/ˈbɑːskɪtbɔːl/", definition: "篮球运动", example: "I often play football and basketball.", split: "bas-ket-ball（复合词，3个音节）", tags: ["ask 词族 a /ɑː/", "all", "复合词"] },
  { units: ["Unit 2"], word: "always", phonetic: "/ˈɔːlweɪz/", definition: "总是", example: "Liu Jia is kind. She always makes me smile.", split: "al-ways（2个音节）", tags: ["al", "ay"] },

  // Unit 3
  { units: ["Unit 3"], word: "afternoon", phonetic: "/ˌɑːftəˈnuːn/", definition: "下午", example: "Good afternoon!", split: "af-ter-noon（3个音节）", tags: ["oo"] },
  { units: ["Unit 3"], word: "there", phonetic: "/ðeə(r)/", definition: "（表示存在或发生）；在那里", example: "There is a playground. We often play there.", split: "there（1个音节）", tags: ["th /ð/", "ere/eir /eə/"] },
  { units: ["Unit 3"], word: "playground", phonetic: "/ˈpleɪɡraʊnd/", definition: "游乐场；操场", example: "There is a playground in my community.", split: "play-ground（复合词，2个音节）", tags: ["pl", "ay", "ou/aʊ/", "复合词"] },
  { units: ["Unit 3"], word: "park", phonetic: "/pɑːk/", definition: "公园", example: "There is also a nice park over there.", split: "park（1个音节）", tags: ["ar/ɑː/"] },
  { units: ["Unit 3"], word: "over", phonetic: "/ˈəʊvə(r)/", definition: "在……的远端（或对面）", example: "There is also a nice park over there.", split: "o-ver（2个音节）", tags: ["o 开音节 /əʊ/"] },
  { units: ["Unit 3"], word: "hospital", phonetic: "/ˈhɒspɪtl/", definition: "医院", example: "There is a hospital. I see a doctor there.", split: "hos-pi-tal（3个音节）", tags: ["闭音节 o /ɒ/"] },
  { units: ["Unit 3"], word: "shop", phonetic: "/ʃɒp/", definition: "商店", example: "Look! There is a shop.", split: "shop（1个音节）", tags: ["sh /ʃ/", "闭音节 o /ɒ/"] },
  { units: ["Unit 3"], word: "toilet", phonetic: "/ˈtɔɪlət/", definition: "厕所；卫生间", example: "toilet", split: "toi-let（2个音节）", tags: ["oi"] },
  { units: ["Unit 3"], word: "bus stop", phonetic: "/bʌs stɒp/", definition: "公共汽车站", example: "bus stop", split: "bus stop（复合名词）", tags: ["闭音节 u /ʌ/", "闭音节 o /ɒ/", "复合词"] },
  { units: ["Unit 3"], word: "library", phonetic: "/ˈlaɪbrəri/", definition: "图书馆", example: "This is a library. Wow! There are so many books.", split: "li-brar-y（3个音节）", tags: ["辅+y多音节"] },
  { units: ["Unit 3"], word: "sport", phonetic: "/spɔːt/", definition: "体育运动", example: "There is a playground in my community. I often do sports there.", split: "sport（1个音节）", tags: ["or/ɔː/"] },
  { units: ["Unit 3"], word: "walk", phonetic: "/wɔːk/", definition: "散步；行走", example: "There is a beautiful park. I often take a walk there.", split: "walk（1个音节）", tags: ["al"] },
  { units: ["Unit 3"], word: "community", phonetic: "/kəˈmjuːnəti/", definition: "社区", example: "There is a playground in my community.", split: "com-mu-ni-ty（4个音节）", tags: ["辅+y多音节"] },
  { units: ["Unit 3"], word: "favourite", phonetic: "/ˈfeɪvərɪt/", definition: "最喜欢的", example: "My favourite place is the museum.", split: "fa-vour-ite（3个音节）", tags: ["our/ə/"] },
  { units: ["Unit 3"], word: "place", phonetic: "/pleɪs/", definition: "地方；场所", example: "My favourite place is the museum.", split: "place（1个音节）", tags: ["pl", "VCe a_e /eɪ/"] },
  { units: ["Unit 3"], word: "photo", phonetic: "/ˈfəʊtəʊ/", definition: "照片", example: "There are many old things and photos.", split: "pho-to（2个音节）", tags: ["ph", "o 开音节 /əʊ/"] },
  { units: ["Unit 3"], word: "story", phonetic: "/ˈstɔːri/", definition: "故事", example: "I can read stories about them.", split: "sto-ry（2个音节）", tags: ["or/ɔː/", "辅+y多音节"] },
  { units: ["Unit 3"], word: "buy", phonetic: "/baɪ/", definition: "购买", example: "People buy gifts and books there.", split: "buy（1个音节）", tags: ["uy /aɪ/"] },

  // Unit 4
  { units: ["Unit 4"], word: "firefighter", phonetic: "/ˈfaɪəfaɪtə(r)/", definition: "消防队员", example: "Our neighbour is a firefighter. He often helps people.", split: "fire-fight-er（复合词，3个音节）", tags: ["ire", "igh", "复合词"] },
  { units: ["Unit 4"], word: "why", phonetic: "/waɪ/", definition: "为什么", example: "Liu Jia's father is also very nice. Why?", split: "why（1个音节）", tags: ["wh /w/", "辅+y 单音节"] },
  { units: ["Unit 4"], word: "driver", phonetic: "/ˈdraɪvə(r)/", definition: "司机", example: "He's a school bus driver. He takes us to school every day.", split: "driv-er（2个音节）", tags: ["i_e /aɪ/"] },
  { units: ["Unit 4"], word: "cleaner", phonetic: "/ˈkliːnə(r)/", definition: "清洁工", example: "He's a cleaner. He cleans the community.", split: "clean-er（2个音节）", tags: ["ea/iː/"] },
  { units: ["Unit 4"], word: "delivery worker", phonetic: "/dɪˈlɪvəri ˈwɜːkə(r)/", definition: "快递员", example: "delivery worker", split: "de-liv-er-y work-er（复合名词）", tags: ["辅+y多音节", "wor /wɜː/", "复合词"] },
  { units: ["Unit 4"], word: "police officer", phonetic: "/pəˈliːs ˈɒfɪsə(r)/", definition: "警察；警员", example: "My neighbour is a police officer. She helps a lot of people.", split: "po-lice of-fi-cer（复合名词）", tags: ["ice 在多音节词中 /iːs/", "闭音节 o /ɒ/", "复合词"] },
  { units: ["Unit 4"], word: "a lot of", phonetic: "/ə lɒt əv/", definition: "大量；许多", example: "She helps a lot of people.", split: "a lot of（短语）", tags: ["闭音节 o /ɒ/", "弱读 of /əv/"] },
  { units: ["Unit 4"], word: "now", phonetic: "/naʊ/", definition: "现在", example: "Look! The students are busy now!", split: "now（1个音节）", tags: ["ow/aʊ/"] },
  { units: ["Unit 4"], word: "make the bed", phonetic: "/meɪk ðə bed/", definition: "铺床", example: "Chen Jie is making the bed.", split: "make the bed（短语）", tags: ["VCe a_e /eɪ/", "闭音节 e /e/"] },
  { units: ["Unit 4"], word: "old", phonetic: "/əʊld/", definition: "过去的；年纪大的；老的", example: "He's singing old songs.", split: "old（1个音节）", tags: ["old"] },
  { units: ["Unit 4"], word: "tell", phonetic: "/tel/", definition: "讲述；告诉", example: "Binbin and John are telling funny stories.", split: "tell（1个音节）", tags: ["闭音节 e /e/", "双写辅音，保护短元音"] },
  { units: ["Unit 4"], word: "everyone", phonetic: "/ˈevriwʌn/", definition: "每人", example: "Everyone is happy!", split: "ev-ery-one（复合词，3个音节）", tags: ["闭音节 e /e/", "复合词"] },
  { units: ["Unit 4"], word: "Ms", phonetic: "/mɪz/", definition: "（用于女子姓氏或姓名前，不指明婚否）女士", example: "Amy is drawing a picture of Ms Xu.", split: "Ms（1个音节）", tags: ["Ms /mɪz/"] },

  // Unit 5
  { units: ["Unit 5"], word: "speak", phonetic: "/spiːk/", definition: "说话；发言", example: "Hello! Mark speaking.", split: "speak（1个音节）", tags: ["ea/iː/"] },
  { units: ["Unit 5"], word: "weather", phonetic: "/ˈweðə(r)/", definition: "天气", example: "What's the weather like in Sydney?", split: "weath-er（2个音节）", tags: ["ea/e/", "th /ð/"] },
  { units: ["Unit 5"], word: "sunny", phonetic: "/ˈsʌni/", definition: "阳光充足的", example: "It's sunny today.", split: "sun-ny（2个音节）", tags: ["闭音节 u /ʌ/", "双写辅音，保护短元音", "辅+y多音节"] },
  { units: ["Unit 5"], word: "hot", phonetic: "/hɒt/", definition: "热的", example: "Is it hot?", split: "hot（1个音节）", tags: ["闭音节 o /ɒ/"] },
  { units: ["Unit 5"], word: "bad", phonetic: "/bæd/", definition: "令人不快的；坏的", example: "That's not bad.", split: "bad（1个音节）", tags: ["闭音节 a /æ/"] },
  { units: ["Unit 5"], word: "cold", phonetic: "/kəʊld/", definition: "冷的", example: "Wow! It's cold!", split: "cold（1个音节）", tags: ["old"] },
  { units: ["Unit 5"], word: "windy", phonetic: "/ˈwɪndi/", definition: "多风的", example: "It's warm and windy.", split: "wind-y（2个音节）", tags: ["闭音节 i /ɪ/", "辅+y多音节"] },
  { units: ["Unit 5"], word: "cloudy", phonetic: "/ˈklaʊdi/", definition: "多云的", example: "It's cool and cloudy.", split: "cloud-y（2个音节）", tags: ["ou/aʊ/", "辅+y多音节"] },
  { units: ["Unit 5"], word: "rainy", phonetic: "/ˈreɪni/", definition: "阴雨的", example: "It's rainy today.", split: "rain-y（2个音节）", tags: ["ai", "辅+y多音节"] },
  { units: ["Unit 5"], word: "snowy", phonetic: "/ˈsnəʊi/", definition: "多雪的", example: "It's snowy today.", split: "snow-y（2个音节）", tags: ["ow/əʊ/", "辅+y多音节"] },
  { units: ["Unit 5"], word: "cool", phonetic: "/kuːl/", definition: "凉爽的", example: "It's cool and sunny.", split: "cool（1个音节）", tags: ["oo"] },
  { units: ["Unit 5"], word: "warm", phonetic: "/wɔːm/", definition: "温暖的", example: "It's warm and windy.", split: "warm（1个音节）", tags: ["war /wɔː/"] },
  { units: ["Unit 5"], word: "tomorrow", phonetic: "/təˈmɒrəʊ/", definition: "在明天", example: "What's the weather like in Beijing tomorrow?", split: "to-mor-row（3个音节）", tags: ["ow/əʊ/"] },
  { units: ["Unit 5"], word: "rain", phonetic: "/reɪn/", definition: "下雨；雨", example: "There is heavy rain now.", split: "rain（1个音节）", tags: ["ai"] },
  { units: ["Unit 5"], word: "closed", phonetic: "/kləʊzd/", definition: "关闭的", example: "But it's closed now.", split: "closed（1个音节）", tags: ["VCe o_e /əʊ/"] },
  { units: ["Unit 5"], word: "film", phonetic: "/fɪlm/", definition: "电影", example: "Let's go and see a film.", split: "film（1个音节）", tags: ["闭音节 i /ɪ/"] },
  { units: ["Unit 5"], word: "idea", phonetic: "/aɪˈdɪə/", definition: "想法；主意", example: "That's a good idea!", split: "i-de-a（3个音节）", tags: ["ea /ɪə/"] },
  { units: ["Unit 5"], word: "fly", phonetic: "/flaɪ/", definition: "操纵（飞行器等）；飞", example: "I fly a kite and I play.", split: "fly（1个音节）", tags: ["辅+y 单音节"] },
  { units: ["Unit 5"], word: "kite", phonetic: "/kaɪt/", definition: "风筝", example: "I fly a kite and I play.", split: "kite（1个音节）", tags: ["i_e /aɪ/"] },
  { units: ["Unit 5"], word: "snowman", phonetic: "/ˈsnəʊmæn/", definition: "雪人", example: "I make a snowman and I play.", split: "snow-man（复合词，2个音节）", tags: ["ow/əʊ/", "闭音节 a /æ/", "复合词"] },
  { units: ["Unit 5"], word: "fun", phonetic: "/fʌn/", definition: "享乐；乐趣", example: "It's fun to go to the park with my new friends.", split: "fun（1个音节）", tags: ["闭音节 u /ʌ/"] },
  { units: ["Unit 5"], word: "their", phonetic: "/ðeə(r)/", definition: "他们的；她们的；它们的", example: "Their children swim in the pool.", split: "their（1个音节）", tags: ["th /ð/", "ere/eir /eə/"] },
  { units: ["Unit 5"], word: "swim", phonetic: "/swɪm/", definition: "游泳", example: "Their children swim in the pool.", split: "swim（1个音节）", tags: ["闭音节 i /ɪ/"] },
  { units: ["Unit 5"], word: "Sydney", phonetic: "/ˈsɪdni/", definition: "悉尼", example: "What's the weather like in Sydney?", split: "Syd-ney（2个音节）", tags: ["闭音节 i /ɪ/", "ey /i/"] },

  // Unit 6
  { units: ["Unit 6"], word: "whose", phonetic: "/huːz/", definition: "谁的", example: "Whose sweater is this, Mum?", split: "whose（1个音节）", tags: ["wh /h/", "o_e /uː/ 特例"] },
  { units: ["Unit 6"], word: "sweater", phonetic: "/ˈswetə(r)/", definition: "毛衣", example: "Whose sweater is this, Mum?", split: "sweat-er（2个音节）", tags: ["ea/e/"] },
  { units: ["Unit 6"], word: "sock", phonetic: "/sɒk/", definition: "短袜", example: "Whose socks are these?", split: "sock（1个音节）", tags: ["闭音节 o /ɒ/"] },
  { units: ["Unit 6"], word: "mine", phonetic: "/maɪn/", definition: "我的", example: "They're mine.", split: "mine（1个音节）", tags: ["i_e /aɪ/"] },
  { units: ["Unit 6"], word: "wear", phonetic: "/weə(r)/", definition: "穿；戴", example: "Can I wear this new shirt today?", split: "wear（1个音节）", tags: ["ear /eə/"] },
  { units: ["Unit 6"], word: "shirt", phonetic: "/ʃɜːt/", definition: "衬衫", example: "Can I wear this new shirt today?", split: "shirt（1个音节）", tags: ["sh /ʃ/", "ir /ɜː/"] },
  { units: ["Unit 6"], word: "coat", phonetic: "/kəʊt/", definition: "大衣；外套", example: "Yes, but wear a coat too.", split: "coat（1个音节）", tags: ["oa /əʊ/"] },
  { units: ["Unit 6"], word: "dress", phonetic: "/dres/", definition: "连衣裙", example: "This purple dress is Mum's.", split: "dress（1个音节）", tags: ["闭音节 e /e/", "双写辅音，保护短元音"] },
  { units: ["Unit 6"], word: "which", phonetic: "/wɪtʃ/", definition: "哪一个；哪一些", example: "Sarah, which season do you like?", split: "which（1个音节）", tags: ["wh /w/", "ch /tʃ/"] },
  { units: ["Unit 6"], word: "season", phonetic: "/ˈsiːzn/", definition: "季节", example: "Which season do you like?", split: "sea-son（2个音节）", tags: ["ea/iː/"] },
  { units: ["Unit 6"], word: "winter", phonetic: "/ˈwɪntə(r)/", definition: "冬天", example: "Spring, summer, autumn and winter.", split: "win-ter（2个音节）", tags: ["闭音节 i /ɪ/"] },
  { units: ["Unit 6"], word: "snow", phonetic: "/snəʊ/", definition: "下雪；雪", example: "Winter. It snows a lot.", split: "snow（1个音节）", tags: ["ow/əʊ/"] },
  { units: ["Unit 6"], word: "get together", phonetic: "/ɡet təˈɡeðə(r)/", definition: "聚会", example: "My family and I often get together and have fun.", split: "get to-geth-er（短语）", tags: ["闭音节 e /e/", "th /ð/"] },
  { units: ["Unit 6"], word: "spring", phonetic: "/sprɪŋ/", definition: "春天", example: "Spring, summer, autumn and winter.", split: "spring（1个音节）", tags: ["ng /ŋ/"] },
  { units: ["Unit 6"], word: "summer", phonetic: "/ˈsʌmə(r)/", definition: "夏天", example: "Spring, summer, autumn and winter.", split: "sum-mer（2个音节）", tags: ["闭音节 u /ʌ/", "双写辅音，保护短元音"] },
  { units: ["Unit 6"], word: "autumn", phonetic: "/ˈɔːtəm/", definition: "秋天", example: "Spring, summer, autumn and winter.", split: "au-tumn（2个音节）", tags: ["au /ɔː/"] },
  { units: ["Unit 6"], word: "T-shirt", phonetic: "/ˈtiːʃɜːt/", definition: "T恤衫", example: "Wear dresses and T-shirts.", split: "T-shirt（复合词）", tags: ["sh /ʃ/", "ir /ɜː/", "复合词"] },
  { units: ["Unit 6"], word: "fall", phonetic: "/fɔːl/", definition: "落下", example: "I like the falling leaves.", split: "fall（1个音节）", tags: ["all"] },
  { units: ["Unit 6"], word: "leaf", phonetic: "/liːf/", definition: "叶（复数 leaves）", example: "I like the falling leaves.", split: "leaf（1个音节）", tags: ["ea/iː/"] },
  { units: ["Unit 6"], word: "glove", phonetic: "/ɡlʌv/", definition: "手套", example: "Oh, where is my glove?", split: "glove（1个音节）", tags: ["o /ʌ/ 特例"] },
  { units: ["Unit 6"], word: "then", phonetic: "/ðen/", definition: "然后；那时", example: "Then spring comes again.", split: "then（1个音节）", tags: ["th /ð/", "闭音节 e /e/"] },
];

const expectedMembershipCount = entries.reduce((sum, entry) => sum + entry.units.length, 0);
const expectedWords = entries.map((entry) => entry.word);
const expectedWordKeys = new Set(expectedWords.map((word) => word.toLocaleLowerCase("en-US")));

function notesFor(entry) {
  return `音节拆分：${entry.split}。自然拼读重点：${entry.tags.join("；")}。`;
}

function mergeExamples(existing, incoming) {
  const lines = [];
  const seen = new Set();
  for (const value of [existing, incoming]) {
    for (const rawLine of value?.split(/\r?\n/) ?? []) {
      const line = rawLine.trim();
      const key = line.toLocaleLowerCase("en-US");
      if (line && !seen.has(key)) {
        seen.add(key);
        lines.push(line);
      }
    }
  }
  return lines.join("\n");
}

const connection = await mysql.createConnection(databaseUrl);
const query = async (sql, params = []) => (await connection.query(sql, params))[0];

const [existingTextbook] = await query(
  "SELECT * FROM textbooks WHERE userId = ? AND name = ? LIMIT 1",
  [catalogOwnerId, textbookName],
);
const existingGroups = existingTextbook
  ? await query(
      "SELECT * FROM word_groups WHERE userId = ? AND textbookId = ? ORDER BY sortOrder, id",
      [catalogOwnerId, existingTextbook.id],
    )
  : [];
const currentWords = await query(
  `SELECT w.*, g.textbookId primaryTextbookId
     FROM words w
LEFT JOIN word_groups g ON g.id = w.groupId
    WHERE w.userId = ? AND LOWER(TRIM(w.word)) IN (?)`,
  [catalogOwnerId, [...expectedWordKeys]],
);
const currentTextbookWords = existingTextbook
  ? await query(
      `SELECT DISTINCT w.*, primaryGroup.textbookId primaryTextbookId
         FROM word_group_links link
         JOIN word_groups linkedGroup ON linkedGroup.id = link.groupId
         JOIN words w ON w.id = link.wordId
    LEFT JOIN word_groups primaryGroup ON primaryGroup.id = w.groupId
        WHERE linkedGroup.textbookId = ? AND w.userId = ?`,
      [existingTextbook.id, catalogOwnerId],
    )
  : [];
const currentByKey = new Map(
  currentWords.map((word) => [word.word.trim().toLocaleLowerCase("en-US"), word]),
);

console.log(
  JSON.stringify(
    {
      mode: apply ? "apply" : "dry-run",
      textbookExists: Boolean(existingTextbook),
      existingTextbookId: existingTextbook ? Number(existingTextbook.id) : null,
      existingGroupCount: existingGroups.length,
      expectedUniqueWords: expectedWordKeys.size,
      expectedMemberships: expectedMembershipCount,
      existingUniqueWords: currentByKey.size,
      wordsToInsert: entries
        .filter((entry) => !currentByKey.has(entry.word.toLocaleLowerCase("en-US")))
        .map((entry) => entry.word),
    },
    null,
    2,
  ),
);

if (!apply) {
  await connection.end();
  process.exit(0);
}

const affectedWordById = new Map(
  [...currentTextbookWords, ...currentWords].map((word) => [Number(word.id), word]),
);
const affectedWords = [...affectedWordById.values()];
const existingWordIds = [...affectedWordById.keys()];
const backup = {
  createdAt: new Date().toISOString(),
  catalogOwnerId,
  textbook: existingTextbook ?? null,
  groups: existingGroups,
  words: affectedWords,
  links:
    existingWordIds.length > 0
      ? await query(
          "SELECT * FROM word_group_links WHERE wordId IN (?) ORDER BY id",
          [existingWordIds],
        )
      : [],
  tags: await query(
    "SELECT * FROM tags WHERE userId = ? AND name IN (?) ORDER BY id",
    [catalogOwnerId, Object.keys(tagDescriptions)],
  ),
  wordTags:
    existingWordIds.length > 0
      ? await query("SELECT * FROM word_tags WHERE wordId IN (?) ORDER BY id", [existingWordIds])
      : [],
  audios:
    existingWordIds.length > 0
      ? await query(
          "SELECT id, wordId, format, source, createdAt, updatedAt, LENGTH(audioData) audioDataLength FROM word_audios WHERE wordId IN (?) ORDER BY id",
          [existingWordIds],
        )
      : [],
};

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const backupDirectory = join(projectRoot, "backups");
await mkdir(backupDirectory, { recursive: true });
const timestamp = backup.createdAt.replaceAll(":", "-").replaceAll(".", "-");
const backupPath = join(backupDirectory, `pep-grade4-volume1-sync-${timestamp}.json`);
const backupJson = JSON.stringify(backup, null, 2);
await writeFile(backupPath, backupJson, "utf8");
console.log(
  JSON.stringify({
    backupPath,
    backupSha256: createHash("sha256").update(backupJson).digest("hex"),
  }),
);

let textbookId;
const groupIdByUnit = new Map();

await connection.beginTransaction();
try {
  if (existingTextbook) {
    textbookId = Number(existingTextbook.id);
    await query(
      "UPDATE textbooks SET description = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
      ["义务教育教科书·英语（PEP）四年级上册，按2025版教材整理", textbookId],
    );
  } else {
    const result = await query(
      `INSERT INTO textbooks (userId, name, description, isDefault, sortOrder)
       VALUES (?, ?, ?, 0, 0)`,
      [
        catalogOwnerId,
        textbookName,
        "义务教育教科书·英语（PEP）四年级上册，按2025版教材整理",
      ],
    );
    textbookId = Number(result.insertId);
  }

  const groups = await query(
    "SELECT * FROM word_groups WHERE userId = ? AND textbookId = ? ORDER BY id",
    [catalogOwnerId, textbookId],
  );
  const groupByNormalizedName = new Map(
    groups.map((group) => [group.name.replaceAll(" ", "").toLocaleLowerCase("en-US"), group]),
  );

  for (let unitNumber = 1; unitNumber <= 6; unitNumber += 1) {
    const unit = `Unit ${unitNumber}`;
    const key = unit.replaceAll(" ", "").toLocaleLowerCase("en-US");
    const existingGroup = groupByNormalizedName.get(key);
    let groupId;
    if (existingGroup) {
      groupId = Number(existingGroup.id);
      await query(
        "UPDATE word_groups SET name = ?, sortOrder = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
        [unit, unitNumber - 1, groupId],
      );
    } else {
      const result = await query(
        `INSERT INTO word_groups (userId, textbookId, name, sortOrder)
         VALUES (?, ?, ?, ?)`,
        [catalogOwnerId, textbookId, unit, unitNumber - 1],
      );
      groupId = Number(result.insertId);
    }
    groupIdByUnit.set(unit, groupId);
  }

  const tagIdByName = new Map();
  for (const [name, description] of Object.entries(tagDescriptions)) {
    const [existingTag] = await query(
      "SELECT id FROM tags WHERE userId = ? AND name = ? ORDER BY id LIMIT 1",
      [catalogOwnerId, name],
    );
    let tagId;
    if (existingTag) {
      tagId = Number(existingTag.id);
      await query("UPDATE tags SET description = ? WHERE id = ?", [description, tagId]);
    } else {
      const result = await query(
        "INSERT INTO tags (userId, name, description) VALUES (?, ?, ?)",
        [catalogOwnerId, name, description],
      );
      tagId = Number(result.insertId);
    }
    tagIdByName.set(name, tagId);
  }

  // Remove legacy four-volume-one memberships that are not official entries.
  const legacyLinks = await query(
    `SELECT link.id, link.wordId, link.groupId, TRIM(w.word) word
       FROM word_group_links link
       JOIN word_groups g ON g.id = link.groupId
       JOIN words w ON w.id = link.wordId
      WHERE g.textbookId = ?`,
    [textbookId],
  );
  const expectedGroupsByWord = new Map(
    entries.map((entry) => [
      entry.word.toLocaleLowerCase("en-US"),
      new Set(entry.units.map((unit) => groupIdByUnit.get(unit))),
    ]),
  );
  for (const link of legacyLinks) {
    const expectedGroups = expectedGroupsByWord.get(
      link.word.toLocaleLowerCase("en-US"),
    );
    if (!expectedGroups?.has(Number(link.groupId))) {
      await query("DELETE FROM word_group_links WHERE id = ?", [link.id]);
    }
  }

  for (const [entryIndex, entry] of entries.entries()) {
    const key = entry.word.toLocaleLowerCase("en-US");
    const [existing] = await query(
      `SELECT w.*, g.textbookId primaryTextbookId
         FROM words w
    LEFT JOIN word_groups g ON g.id = w.groupId
        WHERE w.userId = ? AND LOWER(TRIM(w.word)) = ? LIMIT 1`,
      [catalogOwnerId, key],
    );
    const desiredGroupIds = entry.units.map((unit) => groupIdByUnit.get(unit));
    let wordId;

    if (existing) {
      wordId = Number(existing.id);
      const outsideLinks = await query(
        `SELECT link.groupId
           FROM word_group_links link
           JOIN word_groups g ON g.id = link.groupId
          WHERE link.wordId = ? AND (g.textbookId IS NULL OR g.textbookId <> ?)`,
        [wordId, textbookId],
      );
      const shouldKeepExternalExample = outsideLinks.length > 0;
      const nextExample = shouldKeepExternalExample
        ? mergeExamples(existing.example, entry.example)
        : entry.example;
      const primaryGroupId =
        existing.groupId === null ||
        existing.primaryTextbookId === null ||
        Number(existing.primaryTextbookId) === textbookId
          ? desiredGroupIds[0]
          : Number(existing.groupId);

      await query(
        `UPDATE words
            SET groupId = ?, word = ?, phonetic = ?, definition = ?, example = ?,
                notes = ?, updatedAt = CURRENT_TIMESTAMP
          WHERE id = ? AND userId = ?`,
        [
          primaryGroupId,
          entry.word,
          entry.phonetic,
          entry.definition,
          nextExample,
          notesFor(entry),
          wordId,
          catalogOwnerId,
        ],
      );
    } else {
      const result = await query(
        `INSERT INTO words
          (userId, groupId, word, phonetic, definition, example, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          catalogOwnerId,
          desiredGroupIds[0],
          entry.word,
          entry.phonetic,
          entry.definition,
          entry.example,
          notesFor(entry),
        ],
      );
      wordId = Number(result.insertId);
    }

    for (const groupId of desiredGroupIds) {
      await query(
        "INSERT IGNORE INTO word_group_links (wordId, groupId) VALUES (?, ?)",
        [wordId, groupId],
      );
    }
    for (const tagName of entry.tags) {
      await query(
        "INSERT INTO word_tags (wordId, tagId) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM word_tags WHERE wordId = ? AND tagId = ?)",
        [wordId, tagIdByName.get(tagName), wordId, tagIdByName.get(tagName)],
      );
    }
    if ((entryIndex + 1) % 20 === 0 || entryIndex === entries.length - 1) {
      console.log(
        JSON.stringify({
          phase: "words",
          completed: entryIndex + 1,
          total: entries.length,
        }),
      );
    }
  }

  // The previous single-group model forced these shared words out of 三上.
  // Restore their former 三上 memberships while keeping their 三下 memberships.
  const sharedHistoricalMemberships = [
    { word: "long", textbook: "人教pep三上", unit: "Unit2" },
    { word: "breakfast", textbook: "人教pep三上", unit: "Unit4" },
    { word: "time", textbook: "人教pep三上", unit: "Unit4" },
  ];
  for (const item of sharedHistoricalMemberships) {
    const [word] = await query(
      "SELECT id FROM words WHERE userId = ? AND LOWER(TRIM(word)) = LOWER(?) LIMIT 1",
      [catalogOwnerId, item.word],
    );
    const [group] = await query(
      `SELECT g.id
         FROM word_groups g
         JOIN textbooks t ON t.id = g.textbookId
        WHERE g.userId = ? AND t.name = ?
          AND LOWER(REPLACE(g.name, ' ', '')) = LOWER(REPLACE(?, ' ', ''))
        LIMIT 1`,
      [catalogOwnerId, item.textbook, item.unit],
    );
    if (word && group) {
      await query(
        "INSERT IGNORE INTO word_group_links (wordId, groupId) VALUES (?, ?)",
        [word.id, group.id],
      );
    }
  }

  // Repair legacy primary groups that no longer have a matching association.
  const primaryRows = await query(
    `SELECT w.id, w.groupId
       FROM words w
      WHERE w.userId = ? AND w.groupId IS NOT NULL`,
    [catalogOwnerId],
  );
  for (const word of primaryRows) {
    const [matchingLink] = await query(
      "SELECT id FROM word_group_links WHERE wordId = ? AND groupId = ? LIMIT 1",
      [word.id, word.groupId],
    );
    if (!matchingLink) {
      const [fallbackLink] = await query(
        "SELECT groupId FROM word_group_links WHERE wordId = ? ORDER BY id LIMIT 1",
        [word.id],
      );
      await query(
        "UPDATE words SET groupId = ? WHERE id = ?",
        [fallbackLink?.groupId ?? null, word.id],
      );
    }
  }

  await connection.commit();
  console.log(JSON.stringify({ phase: "database", status: "committed" }));
} catch (error) {
  await connection.rollback();
  throw error;
}

async function downloadAudio(word) {
  const failures = [];
  for (const type of [2, 1]) {
    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.startsWith("audio/")) {
      failures.push(`type=${type}: HTTP ${response.status}, ${contentType || "unknown type"}`);
      continue;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const isId3 = buffer.subarray(0, 3).toString("ascii") === "ID3";
    const isMpegFrame =
      buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
    if (buffer.length >= 500 && (isId3 || isMpegFrame)) return buffer;
    failures.push(`type=${type}: invalid MP3 (${buffer.length} bytes)`);
  }
  throw new Error(`${word}: ${failures.join("; ")}`);
}

const textbookWords = await query(
  `SELECT DISTINCT w.id, w.word
     FROM word_group_links link
     JOIN word_groups g ON g.id = link.groupId
     JOIN words w ON w.id = link.wordId
    WHERE g.textbookId = ? AND w.userId = ?
    ORDER BY w.id`,
  [textbookId, catalogOwnerId],
);
const missingAudio = await query(
  `SELECT DISTINCT w.id, w.word
     FROM word_group_links link
     JOIN word_groups g ON g.id = link.groupId
     JOIN words w ON w.id = link.wordId
LEFT JOIN word_audios a ON a.wordId = w.id
    WHERE g.textbookId = ? AND w.userId = ? AND a.id IS NULL
    ORDER BY w.id`,
  [textbookId, catalogOwnerId],
);

const audioResults = [];
const queue = [...missingAudio];
const workers = Array.from({ length: Math.min(6, queue.length) }, async () => {
  while (queue.length > 0) {
    const word = queue.shift();
    try {
      const buffer = await downloadAudio(word.word);
      const [existingAudio] = await query(
        "SELECT id FROM word_audios WHERE wordId = ? LIMIT 1",
        [word.id],
      );
      if (!existingAudio) {
        await query(
          "INSERT INTO word_audios (wordId, audioData, format, source) VALUES (?, ?, 'mp3', 'youdao')",
          [word.id, buffer.toString("base64")],
        );
      }
      audioResults.push({ word: word.word, status: "inserted", bytes: buffer.length });
    } catch (error) {
      audioResults.push({ word: word.word, status: "failed", error: error.message });
    }
  }
});
await Promise.all(workers);

const membershipRows = await query(
  `SELECT g.name unit, LOWER(TRIM(w.word)) wordKey, w.word,
          w.phonetic, w.example, w.notes,
          COUNT(DISTINCT a.id) audioCount,
          COUNT(DISTINCT wt.tagId) tagCount
     FROM word_group_links link
     JOIN word_groups g ON g.id = link.groupId
     JOIN words w ON w.id = link.wordId
LEFT JOIN word_audios a ON a.wordId = w.id
LEFT JOIN word_tags wt ON wt.wordId = w.id
    WHERE g.textbookId = ? AND w.userId = ?
    GROUP BY g.id, g.name, w.id
    ORDER BY g.sortOrder, w.word`,
  [textbookId, catalogOwnerId],
);

const expectedMemberships = new Set(
  entries.flatMap((entry) =>
    entry.units.map(
      (unit) => `${unit}|${entry.word.toLocaleLowerCase("en-US")}`,
    ),
  ),
);
const actualMemberships = new Set(
  membershipRows.map((row) => `${row.unit}|${row.wordKey}`),
);
const missingMemberships = [...expectedMemberships].filter(
  (membership) => !actualMemberships.has(membership),
);
const unexpectedMemberships = [...actualMemberships].filter(
  (membership) => !expectedMemberships.has(membership),
);

const groupAudit = await query(
  `SELECT g.name unit, COUNT(link.id) membershipCount,
          COUNT(DISTINCT link.wordId) uniqueWordCount
     FROM word_groups g
LEFT JOIN word_group_links link ON link.groupId = g.id
    WHERE g.textbookId = ?
    GROUP BY g.id, g.name, g.sortOrder
    ORDER BY g.sortOrder`,
  [textbookId],
);
const crossBookAudit = await query(
  `SELECT w.word,
          COUNT(DISTINCT g.textbookId) textbookCount,
          GROUP_CONCAT(DISTINCT CONCAT(t.name, ' / ', g.name) ORDER BY t.name, g.sortOrder SEPARATOR ' | ') memberships
     FROM words w
     JOIN word_group_links link ON link.wordId = w.id
     JOIN word_groups g ON g.id = link.groupId
     JOIN textbooks t ON t.id = g.textbookId
    WHERE w.userId = ?
    GROUP BY w.id
   HAVING COUNT(DISTINCT g.textbookId) > 1
    ORDER BY w.word`,
  [catalogOwnerId],
);

console.log(
  JSON.stringify(
    {
      textbookId,
      uniqueWords: textbookWords.length,
      expectedUniqueWords: expectedWordKeys.size,
      expectedMemberships: expectedMembershipCount,
      groupAudit,
      completeness: {
        missingMemberships,
        unexpectedMemberships,
        missingPhonetic: membershipRows.filter((row) => !row.phonetic?.trim()).map((row) => row.word),
        missingExample: membershipRows.filter((row) => !row.example?.trim()).map((row) => row.word),
        missingNotes: membershipRows.filter((row) => !row.notes?.trim()).map((row) => row.word),
        missingTags: membershipRows.filter((row) => Number(row.tagCount) === 0).map((row) => row.word),
        missingAudio: membershipRows.filter((row) => Number(row.audioCount) === 0).map((row) => row.word),
      },
      audio: {
        requested: missingAudio.length,
        inserted: audioResults.filter((item) => item.status === "inserted").length,
        failed: audioResults.filter((item) => item.status === "failed"),
      },
      crossBookWords: crossBookAudit,
    },
    null,
    2,
  ),
);

await connection.end();
