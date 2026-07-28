import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import {
  analyzeWordForStudy,
  formatSyllableDivision,
} from "../src/utils/phonics.ts";

const isGrade3Volume1 = process.argv.includes("--grade3");
const isGrade3Volume2 = process.argv.includes("--grade3-volume2");
const dataset = await import(
  isGrade3Volume2
    ? "./data/xianglu-grade3-volume2-data.mjs"
    : isGrade3Volume1
      ? "./data/xianglu-grade3-volume1-data.mjs"
      : "./data/xianglu-grade4-volume1-data.mjs"
);
const {
  datasetSlug,
  exampleAliases,
  expectedMembershipCount: expectedManifestMembershipCount,
  expectedUnitCount: expectedManifestUnitCount = 9,
  expectedUniqueWordCount,
  supplementalExamples,
  textbookDescription,
  textbookName,
  textbookSentences,
  units,
} = dataset;

const apply = process.argv.includes("--apply");
const databaseUrl = process.env.DATABASE_URL;
const catalogOwnerId = Number(process.env.CATALOG_OWNER_USER_ID);

if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (!Number.isInteger(catalogOwnerId) || catalogOwnerId <= 0) {
  throw new Error("CATALOG_OWNER_USER_ID must be a positive integer");
}
if (units.length !== expectedManifestUnitCount) {
  throw new Error(
    `Expected ${expectedManifestUnitCount} units, received ${units.length}`,
  );
}

const PHONETIC_OVERRIDES = {
  i: "/aɪ/",
  it: "/ɪt/",
  "be (am, is, are)": "/biː (æm, ɪz, ɑː)/",
  "good morning.": "/ɡʊd ˈmɔːnɪŋ/",
  "nice to meet you.": "/naɪs tə miːt juː/",
  "good afternoon.": "/ɡʊd ˌɑːftəˈnuːn/",
  "good evening.": "/ɡʊd ˈiːvnɪŋ/",
  "how are you today?": "/haʊ ɑː juː təˈdeɪ/",
  "thanks.": "/θæŋks/",
  "very well": "/ˈveri wel/",
  "not so good": "/nɒt səʊ ɡʊd/",
  "here you are.": "/hɪə juː ɑː/",
  "thank you.": "/θæŋk juː/",
  "let's draw.": "/lets drɔː/",
  "a (an)": "/ə (ən)/",
  "what does she/he do?": "/wɒt dʌz ʃiː (hiː) duː/",
  "how about you?": "/haʊ əˈbaʊt juː/",
  "sugar painting": "/ˈʃʊɡə ˈpeɪntɪŋ/",
  "take me home": "/teɪk miː həʊm/",
  "one year old": "/wʌn jɪər əʊld/",
  "how many ... are there?": "/haʊ ˈmeni ɑː ðeə/",
  "there is/are ...": "/ðeər ɪz (ɑː)/",
  "what colour is it/are they?": "/wɒt ˈkʌlər ɪz ɪt (ɑː ðeɪ)/",
  "so many": "/səʊ ˈmeni/",
  "... o'clock": "/əˈklɒk/",
  "get up": "/ɡet ʌp/",
  "go to school": "/ɡəʊ tə skuːl/",
  ok: "/ˌəʊˈkeɪ/",
  "eye exercises": "/aɪ ˈeksəsaɪzɪz/",
  "how's your day?": "/haʊz jɔː deɪ/",
  "go home": "/ɡəʊ həʊm/",
  "go to bed": "/ɡəʊ tə bed/",
  "wake up": "/weɪk ʌp/",
  "me too.": "/miː tuː/",
  "put ... in ...": "/pʊt ɪn/",
  "pencil box": "/ˈpensl bɒks/",
  "make yourself at home": "/meɪk jɔːˈself ət həʊm/",
  "would you like ...?": "/wʊd juː laɪk/",
  "i'd like ...": "/aɪd laɪk/",
  "do some sports": "/duː səm spɔːts/",
  "good idea": "/ɡʊd aɪˈdɪə/",
  "do tai chi": "/duː ˌtaɪ ˈtʃiː/",
  "play ping-pong": "/pleɪ ˈpɪŋ pɒŋ/",
  "play basketball": "/pleɪ ˈbɑːskɪtbɔːl/",
  "play football": "/pleɪ ˈfʊtbɔːl/",
  "sports plan": "/spɔːts plæn/",
  "let me help you.": "/let miː help juː/",
  "from ... to ...": "/frəm tuː/",
  "every day": "/ˈevri deɪ/",
  "look at": "/lʊk ət/",
  "cape town": "/ˈkeɪp taʊn/",
  "have ... on": "/hæv ɒn/",
  "how is your holiday?": "/haʊ ɪz jɔː ˈhɒlədeɪ/",
  "what can you do in ...?": "/wɒt kən juː duː ɪn/",
  "go swimming": "/ɡəʊ ˈswɪmɪŋ/",
  "play on the beach": "/pleɪ ɒn ðə biːtʃ/",
  "go running": "/ɡəʊ ˈrʌnɪŋ/",
  "go fishing": "/ɡəʊ ˈfɪʃɪŋ/",
  "play in the snow": "/pleɪ ɪn ðə snəʊ/",
  "go boating": "/ɡəʊ ˈbəʊtɪŋ/",
  "eat ice cream": "/iːt aɪs kriːm/",
  "what's wrong?": "/wɒts rɒŋ/",
  card: "/kɑːd/",
  "take it easy.": "/teɪk ɪt ˈiːzi/",
  "good job!": "/ɡʊd dʒɒb/",
  "why not ...?": "/waɪ nɒt/",
  "listen to music": "/ˈlɪsn tə ˈmjuːzɪk/",
  "play the piano": "/pleɪ ðə piˈænəʊ/",
  "play games": "/pleɪ ɡeɪmz/",
  "have a walk": "/hæv ə wɔːk/",
  "put back": "/pʊt bæk/",
  "line up": "/laɪn ʌp/",
  "no littering.": "/nəʊ ˈlɪtərɪŋ/",
  "no parking.": "/nəʊ ˈpɑːkɪŋ/",
  "watch out": "/wɒtʃ aʊt/",
  "shouldn't": "/ˈʃʊdnt/",
  "traffic light": "/ˈtræfɪk laɪt/",
  "seat belt": "/ˈsiːt belt/",
  "have a picnic": "/hæv ə ˈpɪknɪk/",
  "fly a kite": "/flaɪ ə kaɪt/",
  "see a film": "/siː ə fɪlm/",
  "go to the cinema": "/ɡəʊ tə ðə ˈsɪnəmə/",
  "go camping": "/ɡəʊ ˈkæmpɪŋ/",
  "watch tv": "/wɒtʃ ˌtiː ˈviː/",
  "ride a bike": "/raɪd ə baɪk/",
  "put on": "/pʊt ɒn/",
  "stay away from": "/steɪ əˈweɪ frəm/",
  "swimming pool": "/ˈswɪmɪŋ puːl/",
  shh: "/ʃ/",
};

const AUDIO_QUERY_OVERRIDES = {
  "what does she/he do?": "What does she do?",
  "how many ... are there?": "How many are there?",
  "there is/are ...": "There are.",
  "what colour is it/are they?": "What colour is it?",
  "... o'clock": "o'clock",
  "put ... in ...": "Put it in.",
  "would you like ...?": "Would you like it?",
  "i'd like ...": "I would like it.",
  "from ... to ...": "from Monday to Friday",
  "have ... on": "have on",
  "what can you do in ...?": "What can you do",
};

const IRREGULAR_FORMS = {
  begin: ["begin", "begins", "beginning", "began"],
  break: ["break", "breaks", "breaking", "broke"],
  come: ["come", "comes", "coming", "came"],
  dance: ["dance", "dances", "dancing"],
  drive: ["drive", "drives", "driving", "drove"],
  feel: ["feel", "feels", "feeling", "felt"],
  find: ["find", "finds", "finding", "found"],
  follow: ["follow", "follows", "following"],
  get: ["get", "gets", "getting", "got"],
  give: ["give", "gives", "giving", "gave"],
  jump: ["jump", "jumps", "jumping"],
  keep: ["keep", "keeps", "keeping", "kept"],
  know: ["know", "knows", "knowing", "knew"],
  lost: ["lost", "lose", "loses", "losing"],
  make: ["make", "makes", "making", "made"],
  mean: ["mean", "means", "meaning", "meant"],
  read: ["read", "reads", "reading"],
  say: ["say", "says", "saying", "said"],
  see: ["see", "sees", "seeing", "saw"],
  stand: ["stand", "stands", "standing", "stood"],
  throw: ["throw", "throws", "throwing", "threw"],
};

const TAG_NAME_OVERRIDES = {
  "vowel_combo:ai": "ai",
  "vowel_combo:ay": "ay",
  "vowel_combo:ee": "ee",
  "vowel_combo:eau": "eau /juː/",
  "vowel_combo:eigh": "eigh /eɪ/",
  "vowel_combo:igh": "igh",
  "vowel_combo:oa": "oa /əʊ/",
  "vowel_combo:oi": "oi",
  "vowel_combo:oy": "oy /ɔɪ/",
  "vowel_combo:oo": "oo",
  "vowel_combo:ew": "ew/juː/",
  "vowel_combo:ue": "ue /uː/",
  "vowel_combo:air": "air",
  "vowel_combo:are": "are /eə/",
  "vowel_combo:ere": "ere/eir /eə/",
  "vowel_combo:eir": "ere/eir /eə/",
  "vowel_combo:ire": "ire",
  "vowel_combo:ore": "ore",
  "vowel_combo:oor": "oor",
  "consonant_blend:ch": "ch /tʃ/",
  "consonant_blend:ck": "ck /k/",
  "consonant_blend:nk": "nk /ŋk/",
  "consonant_blend:ph": "ph",
  "consonant_blend:pl": "pl",
  "consonant_blend:qu": "qu",
  "consonant_blend:sh": "sh /ʃ/",
  "consonant_blend:wh": "wh /w/",
  "consonant_blend:str": "str",
  "magic_e:a_e": "VCe a_e /eɪ/",
  "magic_e:i_e": "i_e /aɪ/",
  "magic_e:o_e": "VCe o_e /əʊ/",
  "r_controlled:ar": "ar/ɑː/",
  "r_controlled:ir": "ir /ɜː/",
  "r_controlled:or": "or/ɔː/",
  "r_controlled:ur": "ur",
};

const STATIC_TAG_DESCRIPTIONS = {
  "闭音节 a /æ/":
    "闭音节中，一个 a 后面由辅音收尾时通常发短元音 /æ/，如 sad、back。",
  "闭音节 e /e/":
    "闭音节中，一个 e 后面由辅音收尾时通常发短元音 /e/，如 get。",
  "闭音节 i /ɪ/":
    "闭音节中，一个 i 后面由辅音收尾时通常发短元音 /ɪ/，如 pick、film。",
  "闭音节 o /ɒ/":
    "英式英语中，闭音节里的 o 通常发短元音 /ɒ/，如 lost、stop。",
  "闭音节 u /ʌ/":
    "闭音节中，一个 u 后面由辅音收尾时通常发短元音 /ʌ/，如 cup。",
  "辅音+y 单音节 /aɪ/":
    "单音节词末尾的“辅音字母 + y”通常发 /aɪ/，如 my、why、dry、fly；bye、goodbye 末尾的 y 也归入这一长音类别。",
  "辅+y多音节":
    "多音节词末尾的“辅音字母 + y”中，y 通常发 /i/，如 happy、rainy。",
  "双写辅音，保护短元音":
    "两个相同辅音通常提示前一个重读音节保持短元音，拆音节时常从双辅音中间分开。",
  "ing/ɪŋ/":
    "词尾 ing 通常发 /ɪŋ/，其中 ng 合起来发鼻音 /ŋ/。",
  "ong/ɒŋ/":
    "词尾 ong 在 long、song、strong、wrong 等词中通常读 /ɒŋ/：o 发英式短元音 /ɒ/，ng 合起来发鼻音 /ŋ/。",
  "oy /ɔɪ/":
    "oy 常出现在单词或音节末尾，整体发双元音 /ɔɪ/，如 boy、toy、enjoy。",
  "-ed 词尾":
    "词尾 -ed 的读音会随前一个音变化，可读 /t/、/d/ 或 /ɪd/；需要结合完整单词判断。",
  "th /θ/":
    "th 在 both、mouth、birthday、thanks、thing、three、throw 等词中通常发清辅音 /θ/，发音时舌尖轻触上下齿。",
  "wh /h/":
    "wh 在 who 等少数疑问词中发 /h/，其中 w 不单独发音。",
  "eigh /eɪ/":
    "eigh 在 eight、eighteen、weight 等词中通常整体发 /eɪ/。",
  "eau /juː/":
    "eau 在 beautiful 中整体对应 /juː/，拼读时不要拆成 ea 和 au 两个组合。",
  "air /eə/":
    "air 在 hair、chair、fair 等词中，英式英语通常发 /eə/。",
  "are /ɑː/（单词）":
    "are 作为 be 动词形式时，英式英语通常发 /ɑː/；不要套用 share 中 are 的 /eə/。",
  "our /aʊə/":
    "our 单独作“我们的”时，英式英语常读 /aʊə/，快速口语中也可能弱化。",
  "our /ɔː/（four）":
    "four 中的 our 在英式英语中发 /ɔː/，需要按完整单词记忆。",
  "your /jɔː/":
    "your 在英式英语中通常发 /jɔː/，其中 our 不按单词 our 的 /aʊə/ 发音。",
  "-our /ə/（colour）":
    "colour 中的 -our 在英式英语中弱读为 /ə/，美式拼写通常写作 color。",
  "oo /ʊ/":
    "oo 在 good、look、cook 等常用词中发短音 /ʊ/。",
  "oot/ood/ook":
    "oo 在 cook、foot、good、look 等常用词中发短元音 /ʊ/。",
  "oo /uː/":
    "oo 在 too、afternoon 等词中通常发长元音 /uː/。",
  "ou /uː/（you）":
    "you 中的 ou 发 /uː/，不同于 out、count 中 ou 的 /aʊ/。",
  "ie /e/（friend）":
    "friend 中的 ie 例外地发 /e/，需要按完整单词记忆。",
  "ea /eə/（yeah）":
    "yeah 中的 ea 在英式英语中通常读作 /eə/，整个词读 /jeə/。",
  "a /ɒ/（what/want）":
    "what、want 中的 a 在英式英语中发 /ɒ/，不按普通闭音节 a 的 /æ/ 发音。",
  "-ar /ə/（sugar）":
    "sugar 词尾的 ar 在非重读音节中弱读为 /ə(r)/，不按普通 ar 的 /ɑː/ 发音。",
  "o /ɒ/（orange）":
    "orange 首音节中的 o 在英式英语中通常发 /ɒ/，不按普通 or 的 /ɔː/ 拼读。",
  "-or /ə/（doctor）":
    "doctor 词尾的 -or 在英式英语中弱读为 /ə(r)/，不按重读 or 的 /ɔː/ 发音。",
  "er /ə/（非重读）":
    "afternoon 中间的 er，以及 teacher、driver、mother 等词尾的 er，在非重读音节中通常弱读为 /ə(r)/。",
  "er /ɜː/（her）":
    "her 单独重读时，er 在英式英语中通常发 /ɜː/。",
  "ur /ɜː/":
    "ur 在 nurse、turn 等词中通常发 /ɜː/。",
  ur:
    "ur 在 nurse、turn 等词中通常发 /ɜː/。",
  air:
    "air 在 hair、chair、fair 等词中，英式英语通常发 /eə/。",
  "ew/juː/":
    "ew 在 new、few 等词中通常发 /juː/ 或 /uː/。",
  "our /ɔː/":
    "our 在 four、fourteen、your 等词中，英式英语通常发 /ɔː/。",
  "or 在非重读音节/ər/":
    "or 在 doctor 等词的非重读音节中通常弱读为 /ə/，美式英语常带 /r/。",
  "开音节 i /aɪ/":
    "I、hi 等开音节词中的 i 发字母本音 /aɪ/。",
  "开音节 e /iː/":
    "he、me 等开音节词中的 e 发长元音 /iː/。",
  "开音节 o /əʊ/":
    "go、no 等开音节词中的 o 通常发字母本音 /əʊ/。",
  "字母名称 O-K":
    "OK 读作两个字母名称 /ˌəʊˈkeɪ/，不按普通闭音节单词拼读。",
  "a /ɑː/（banana）":
    "banana 在英式英语中的重读音节通常读 /ˈnɑː/，首尾非重读 a 常弱化为 /ə/。",
  "ar /ɔː/（warm）":
    "warm、war 等词中，w 后面的 ar 在英式英语里通常读 /ɔː/，不按普通 ar 的 /ɑː/ 拼读。",
  "all /ɔːl/":
    "all、ball、tall 以及 basketball、football、volleyball 词尾的 all 通常整体读 /ɔːl/。",
  "old /əʊld/":
    "old、cold 等词中的 old 通常整体读 /əʊld/，不按普通闭音节 o 的 /ɒ/ 拼读。",
  "ou /ʊ/（would）":
    "would、could、should 中的 ou 通常发 /ʊ/，其中 l 不单独发音。",
  "eye /aɪ/":
    "eye 整体读 /aɪ/，不按 ey 在 hey 中的 /eɪ/ 规则拼读。",
  "o /uː/ 特例":
    "do 等少数常用词中的 o 发 /uː/，需要按完整单词记忆。",
  "冠词 a/an 弱读":
    "不定冠词 a、an 在句中通常分别弱读为 /ə/、/ən/。",
  "称谓缩写 Mr/Mrs":
    "Mr 和 Mrs 是称谓缩写，分别读作 /ˈmɪstə(r)/ 和 /ˈmɪsɪz/，不能按字母逐个拼读。",
  "a /ɑː/（aha）":
    "aha 末尾重读音节中的 a 发 /ɑː/，整个词通常读 /əˈhɑː/。",
  "o /əʊ/ 特例":
    "both、most 等少数外形像闭音节的常用词中，字母 o 发 /əʊ/，不按普通闭音节 o 的 /ɒ/ 拼读。",
  "ea/e/":
    "ea 在 weather、heavy 等常用词中例外地发短元音 /e/。",
  "ea/eɪ/":
    "ea 在 break、great、steak 等少数常用词中发 /eɪ/，需要作为特殊读音归类记忆。",
  "ear /ɪə/":
    "ear 在 hear、near、dear、clear 等词中，英式英语通常发 /ɪə/；美式英语通常读作 /ɪr/。",
  "ear /eə/":
    "ear 在 bear、pear、wear、swear 等词中，英式英语通常发 /eə/；美式英语通常读作 /er/。",
  "ear /ɜː/":
    "ear 在 learn、earth、early 等词中，英式英语通常发 /ɜː/；美式英语通常读作 /ɝː/。",
  "ea/iː/":
    "ea 在 read 等词中发长元音 /iː/。",
  "ea /ɪə/":
    "ea 在 really 等词中可读作 /ɪə/ 或在连读中弱化，需要结合整个单词记忆。",
  "ere /ɪə/":
    "ere 在 here 中，英式英语通常发 /ɪə/；美式英语通常读作带卷舌音的 /ɪr/。",
  "ow/əʊ/":
    "ow 在 snow、snowy、window、follow 等词中常发 /əʊ/。",
  "ow/aʊ/":
    "ow 在少数常用词中发 /aʊ/，如 how、now。",
  "ou/aʊ/":
    "ou 在 count、out、cloud 等词中通常发双元音 /aʊ/。",
  "-ous /əs/":
    "形容词词尾 -ous 通常弱读为 /əs/，如 nervous；其中 ou 不发 /aʊ/。",
  "u 开音节 /juː/":
    "u 在 museum 等词的开音节中可发 /juː/，需要把辅音 /j/ 和长元音 /uː/ 连起来读。",
  "ey /eɪ/":
    "ey 在 hey 等少数单音节词中发 /eɪ/，与 day、play 中的 ay 发音相同。",
  "u /ʊ/ 特例":
    "put 等少数常用词中的字母 u 发 /ʊ/，不同于普通闭音节 u 的 /ʌ/。",
  "VCe a_e 例外 /æ/":
    "have 等词虽然外形是 VCe（元音—辅音—e），但 a 不发字母本音 /eɪ/，而发短元音 /æ/。",
  "VCe i_e 例外 /ɪ/":
    "give 等词虽然外形是 VCe（元音—辅音—e），但 i 不发字母本音 /aɪ/，而发短元音 /ɪ/。",
  "VCe o_e 例外 /ʌ/":
    "come、love、some、one 等词虽然外形是 VCe（元音—辅音—e），但 o 不发字母本音 /əʊ/，需要作为例外归类记忆。",
  "VCe u_e /uː/":
    "u_e 是 VCe（元音—辅音—不发音 e）结构，末尾 e 通常不发音，u 发 /uː/ 或 /juː/，如 rule、cute。",
  "ure /ʊə/":
    "ure 在 sure 等词中，英式英语可发 /ʊə/，部分口音中也可读作 /ɔː/，需要结合完整单词记忆。",
  "a /ɑː/（英音）":
    "dance、fast、chance 等词中的 a 在英式英语中常发 /ɑː/；美式英语中通常发 /æ/。",
  "ass/ɑː/":
    "ass 在 class、grass 等词中，英式英语通常发 /ɑːs/；美式英语中通常发 /æs/。",
  al:
    "al 在 talk、walk 等词中常发 /ɔː/，其中 l 在部分口音中不单独发音。",
  "t 不发音":
    "listen、castle、whistle 等词中的字母 t 通常不发音，拼读时不要把相邻字母当作普通 st 连缀。",
  "mb（b不发音）":
    "词尾 mb 中的 b 通常不发音，只读 /m/，如 climb、lamb、thumb。",
};

const MANUAL_TAGS_BY_WORD = {
  dance: ["a /ɑː/（英音）"],
  fast: ["a /ɑː/（英音）"],
  grass: ["ass/ɑː/"],
  talk: ["al"],
  "listen to music": ["t 不发音"],
  climb: ["mb（b不发音）"],
  both: ["o /əʊ/ 特例"],
  most: ["o /əʊ/ 特例"],
  they: ["ey /eɪ/"],
  "good afternoon.": ["oo /uː/"],
  goodbye: ["辅音+y 单音节 /aɪ/"],
  bye: ["辅音+y 单音节 /aɪ/"],
  i: ["开音节 i /aɪ/"],
  hi: ["开音节 i /aɪ/"],
  he: ["开音节 e /iː/"],
  me: ["开音节 e /iː/"],
  do: ["o /uː/ 特例"],
  "a (an)": ["冠词 a/an 弱读"],
  mr: ["称谓缩写 Mr/Mrs"],
  mrs: ["称谓缩写 Mr/Mrs"],
  seven: ["闭音节 e /e/"],
  orange: ["o /ɒ/（orange）"],
  aha: ["a /ɑː/（aha）"],
  what: ["a /ɒ/（what/want）"],
  want: ["a /ɒ/（what/want）"],
  museum: ["u 开音节 /juː/"],
  begin: ["闭音节 i /ɪ/"],
  hey: ["ey /eɪ/"],
  "put on": ["u /ʊ/ 特例", "闭音节 o /ɒ/"],
  "get up": ["闭音节 e /e/", "闭音节 u /ʌ/"],
  go: ["开音节 o /əʊ/"],
  "go to bed": ["开音节 o /əʊ/", "闭音节 e /e/"],
  ok: ["字母名称 O-K"],
  "eye exercises": ["eye /aɪ/"],
  "put ... in ...": ["u /ʊ/ 特例", "闭音节 i /ɪ/"],
  "pencil box": ["闭音节 e /e/", "闭音节 o /ɒ/"],
  pencil: ["闭音节 e /e/"],
  banana: ["a /ɑː/（banana）"],
  we: ["开音节 e /iː/"],
  "a lot of": ["闭音节 o /ɒ/"],
  "would you like ...?": ["ou /ʊ/（would）", "ou /uː/（you）"],
};

const LEGACY_TAGS_TO_REMOVE_BY_WORD = {
  all: ["闭音节 a /æ/", "双写辅音，保护短元音"],
  baby: ["辅+y 单音节", "辅音+y 单音节 /aɪ/"],
  bread: ["ea/iː/"],
  breakfast: ["ea/iː/"],
  cold: ["闭音节 o /ɒ/"],
  colourful: ["or 在非重读音节/ər/", "or/ɔː/", "our /aʊə/", "our/ə/"],
  driver: ["i_e /aɪ/"],
  favourite: ["or 在非重读音节/ər/", "or/ɔː/", "our /aʊə/", "our/ə/"],
  mouth: ["th", "th /ð/"],
  ok: ["闭音节 o /ɒ/"],
  sister: ["er"],
  sweater: ["ea/iː/"],
  tall: ["闭音节 a /æ/", "双写辅音，保护短元音"],
  teacher: ["er"],
  wear: ["ear /ɪə/"],
  where: ["ere /ɪə/", "wh /h/"],
};

const PHONICS_TAG_ASSERTIONS_BY_WORD = {
  all: {
    required: ["all /ɔːl/"],
    forbidden: ["闭音节 a /æ/", "双写辅音，保护短元音"],
  },
  baby: {
    required: ["辅+y多音节"],
    forbidden: ["辅+y 单音节", "辅音+y 单音节 /aɪ/"],
  },
  beautiful: {
    required: ["eau /juː/"],
    forbidden: ["ea/iː/", "au"],
  },
  both: {
    required: ["o /əʊ/ 特例", "th /θ/"],
    forbidden: ["闭音节 o /ɒ/", "th /ð/"],
  },
  bread: {
    required: ["ea/e/"],
    forbidden: ["ea/iː/"],
  },
  breakfast: {
    required: ["ea/e/"],
    forbidden: ["ea/iː/"],
  },
  cold: {
    required: ["old /əʊld/"],
    forbidden: ["闭音节 o /ɒ/"],
  },
  colourful: {
    required: ["-our /ə/（colour）"],
    forbidden: ["our /aʊə/", "our/ə/"],
  },
  doctor: {
    required: ["or 在非重读音节/ər/"],
    forbidden: ["or/ɔː/"],
  },
  driver: {
    required: ["dr", "er /ə/（非重读）"],
    forbidden: ["i_e /aɪ/"],
  },
  four: {
    required: ["our /ɔː/"],
    forbidden: ["our /aʊə/"],
  },
  favourite: {
    required: ["-our /ə/（colour）"],
    forbidden: ["our /aʊə/", "our/ə/"],
  },
  friend: {
    required: ["ie /e/（friend）"],
    forbidden: ["ie"],
  },
  "good afternoon.": {
    required: ["oo /uː/", "oot/ood/ook"],
    forbidden: [],
  },
  goodbye: {
    required: ["oot/ood/ook", "辅音+y 单音节 /aɪ/"],
    forbidden: ["辅+y多音节"],
  },
  great: {
    required: ["ea/eɪ/"],
    forbidden: ["ea/iː/"],
  },
  hair: {
    required: ["air"],
    forbidden: [],
  },
  mouth: {
    required: ["th /θ/"],
    forbidden: ["th", "th /ð/"],
  },
  "here you are.": {
    required: ["are /ɑː/（单词）", "ere /ɪə/", "ou /uː/（you）"],
    forbidden: ["are /eə/", "ere/eir /eə/", "ou/aʊ/"],
  },
  orange: {
    required: ["o /ɒ/（orange）"],
    forbidden: ["or/ɔː/"],
  },
  ok: {
    required: ["字母名称 O-K"],
    forbidden: ["闭音节 o /ɒ/"],
  },
  "play basketball": {
    required: ["all /ɔːl/"],
    forbidden: ["双写辅音，保护短元音"],
  },
  "play football": {
    required: ["oot/ood/ook", "all /ɔːl/"],
    forbidden: ["oo /uː/", "双写辅音，保护短元音"],
  },
  our: {
    required: ["our /aʊə/"],
    forbidden: ["our /ɔː/"],
  },
  sister: {
    required: ["er /ə/（非重读）"],
    forbidden: ["er"],
  },
  "sugar painting": {
    required: ["-ar /ə/（sugar）"],
    forbidden: ["ar/ɑː/"],
  },
  teacher: {
    required: ["er /ə/（非重读）"],
    forbidden: ["er"],
  },
  "thank you.": {
    required: ["ou /uː/（you）", "th /θ/"],
    forbidden: ["ou/aʊ/", "th /ð/"],
  },
  "thanks.": {
    required: ["th /θ/"],
    forbidden: ["th /ð/"],
  },
  three: {
    required: ["th /θ/"],
    forbidden: ["th /ð/"],
  },
  thursday: {
    required: ["th /θ/"],
    forbidden: ["th /ð/"],
  },
  tall: {
    required: ["all /ɔːl/"],
    forbidden: ["闭音节 a /æ/", "双写辅音，保护短元音"],
  },
  want: {
    required: ["a /ɒ/（what/want）"],
    forbidden: ["闭音节 a /æ/"],
  },
  what: {
    required: ["a /ɒ/（what/want）", "wh /w/"],
    forbidden: ["闭音节 a /æ/"],
  },
  warm: {
    required: ["ar /ɔː/（warm）"],
    forbidden: ["ar/ɑː/"],
  },
  wear: {
    required: ["ear /eə/"],
    forbidden: ["ear /ɪə/"],
  },
  we: {
    required: ["开音节 e /iː/"],
    forbidden: [],
  },
  where: {
    required: ["ere/eir /eə/", "wh /w/"],
    forbidden: ["ere /ɪə/", "wh /h/"],
  },
  who: {
    required: ["wh /h/"],
    forbidden: ["wh /w/"],
  },
  yeah: {
    required: ["ea /eə/（yeah）"],
    forbidden: ["ea/iː/"],
  },
  yellow: {
    required: ["ow/əʊ/"],
    forbidden: ["ow/aʊ/"],
  },
  you: {
    required: ["ou /uː/（you）"],
    forbidden: ["ou/aʊ/"],
  },
  your: {
    required: ["our /ɔː/"],
    forbidden: ["our /aʊə/"],
  },
};

function normalizeKey(value) {
  return value.trim().toLocaleLowerCase("en-US");
}

function uniqueLines(values) {
  const result = [];
  const seen = new Set();
  for (const value of values) {
    const line = value?.trim();
    const key = line?.toLocaleLowerCase("en-US");
    if (line && !seen.has(key)) {
      seen.add(key);
      result.push(line);
    }
  }
  return result;
}

function mergeMultiline(existing, incoming) {
  return uniqueLines([
    ...(existing?.split(/\r?\n/) ?? []),
    ...(incoming?.split(/\r?\n/) ?? []),
  ]).join("\n");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchAlias(sentence, alias) {
  const escaped = escapeRegExp(alias);
  return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i").test(sentence);
}

function aliasesFor(word) {
  if (exampleAliases[word]) return exampleAliases[word];
  const key = normalizeKey(word).replace(/[.!?]+$/g, "");
  if (key.includes(" ")) return [key];
  if (IRREGULAR_FORMS[key]) return IRREGULAR_FORMS[key];
  if (key.endsWith("e")) {
    return [key, `${key}s`, `${key.slice(0, -1)}ing`, `${key}d`];
  }
  if (/[^aeiou]y$/.test(key)) {
    return [key, `${key.slice(0, -1)}ies`, `${key.slice(0, -1)}ied`];
  }
  return [key, `${key}s`, `${key}ed`, `${key}ing`];
}

function examplesFor(word) {
  const aliases = aliasesFor(word);
  return uniqueLines([
    ...textbookSentences.filter((sentence) =>
      aliases.some((alias) => matchAlias(sentence, alias)),
    ),
    ...(supplementalExamples[normalizeKey(word)] ?? []),
  ]).slice(0, 3);
}

function buildEntries() {
  const byKey = new Map();
  for (const unit of units) {
    for (const [word, definition] of unit.words) {
      const key = normalizeKey(word);
      const entry = byKey.get(key) ?? {
        word,
        definitions: [],
        units: [],
        examples: examplesFor(word),
      };
      entry.definitions = uniqueLines([...entry.definitions, definition]);
      entry.units = uniqueLines([...entry.units, unit.name]);
      byKey.set(key, entry);
    }
  }
  return [...byKey.values()].map((entry) => ({
    ...entry,
    definition: entry.definitions.join("；"),
    example: entry.examples.join("\n"),
  }));
}

function tagNameForPattern(word, pattern) {
  const normalizedWord = normalizeKey(word);
  const wordTokens = normalizedWord.match(/[a-z]+/g) ?? [];
  if (pattern.type === "consonant_blend" && pattern.text === "ng") {
    if (wordTokens.some((token) => token.endsWith("ong"))) {
      return "ong/ɒŋ/";
    }
    if (wordTokens.some((token) => token.endsWith("ing"))) {
      return "ing/ɪŋ/";
    }
    return null;
  }
  if (pattern.type === "magic_e") {
    if (
      ["come", "done", "glove", "love", "some", "one"].some((token) =>
        wordTokens.includes(token),
      )
    ) {
      return "VCe o_e 例外 /ʌ/";
    }
    if (
      normalizedWord === "have" ||
      normalizedWord.startsWith("have a ")
    ) {
      return "VCe a_e 例外 /æ/";
    }
    if (normalizedWord === "give") return "VCe i_e 例外 /ɪ/";
    if (normalizedWord === "sure") return "ure /ʊə/";

    return {
      a: "VCe a_e /eɪ/",
      e: "VCe e_e /iː/",
      i: "i_e /aɪ/",
      o: "VCe o_e /əʊ/",
      u: "VCe u_e /uː/",
    }[pattern.text[0]] ?? pattern.text;
  }
  if (pattern.type === "vowel_combo" && pattern.text === "are") {
    return wordTokens.includes("are") ? "are /ɑː/（单词）" : "are /eə/";
  }
  if (pattern.type === "vowel_combo" && pattern.text === "our") {
    if (wordTokens.includes("your") || wordTokens.includes("four")) {
      return "our /ɔː/";
    }
    if (
      wordTokens.some(
        (token) => token.startsWith("colour") || token === "favourite",
      )
    ) {
      return "-our /ə/（colour）";
    }
    return "our /aʊə/";
  }
  if (pattern.type === "vowel_combo" && pattern.text === "oo") {
    return wordTokens.some((token) =>
      ["book", "cook", "foot", "good", "goodbye", "look"].includes(token) ||
      token.startsWith("foot"),
    )
      ? "oot/ood/ook"
      : "oo /uː/";
  }
  if (
    pattern.type === "vowel_combo" &&
    pattern.text === "ie" &&
    wordTokens.includes("friend")
  ) {
    return "ie /e/（friend）";
  }
  if (
    pattern.type === "vowel_combo" &&
    pattern.text === "ere" &&
    wordTokens.includes("here")
  ) {
    return "ere /ɪə/";
  }
  if (pattern.type === "consonant_blend" && pattern.text === "wh") {
    return wordTokens.includes("who") ? "wh /h/" : "wh /w/";
  }
  if (pattern.type === "r_controlled" && pattern.text === "ar") {
    if (wordTokens.includes("sugar")) return "-ar /ə/（sugar）";
    if (wordTokens.includes("warm")) return "ar /ɔː/（warm）";
    return "ar/ɑː/";
  }
  if (pattern.type === "r_controlled" && pattern.text === "or") {
    if (wordTokens.includes("orange")) return "o /ɒ/（orange）";
    if (wordTokens.includes("doctor")) return "or 在非重读音节/ər/";
    return "or/ɔː/";
  }
  if (pattern.type === "r_controlled" && pattern.text === "er") {
    return wordTokens.includes("her")
      ? "er /ɜː/（her）"
      : "er /ə/（非重读）";
  }
  const key = `${pattern.type}:${pattern.text}`;
  if (TAG_NAME_OVERRIDES[key]) return TAG_NAME_OVERRIDES[key];
  if (pattern.type === "vowel_combo" && pattern.text === "ea") {
    if (wordTokens.includes("yeah")) return "ea /eə/（yeah）";
    if (
      ["bread", "breakfast", "dead", "head", "healthy", "heavy", "ready", "sweater", "weather"].includes(
        normalizedWord,
      )
    ) {
      return "ea/e/";
    }
    if (["break", "great", "steak"].includes(normalizedWord)) {
      return "ea/eɪ/";
    }
    if (normalizedWord === "really") return "ea /ɪə/";
    return "ea/iː/";
  }
  if (pattern.type === "vowel_combo" && pattern.text === "ear") {
    if (["bear", "pear", "swear", "wear"].includes(normalizedWord)) {
      return "ear /eə/";
    }
    if (["early", "earth", "heard", "learn"].includes(normalizedWord)) {
      return "ear /ɜː/";
    }
    return "ear /ɪə/";
  }
  if (pattern.type === "vowel_combo" && pattern.text === "ow") {
    return ["follow", "snow", "snowman", "snowy", "throw", "window", "yellow"].some(
      (part) => normalizeKey(word).includes(part),
    )
      ? "ow/əʊ/"
      : "ow/aʊ/";
  }
  if (pattern.type === "vowel_combo" && pattern.text === "ou") {
    if (wordTokens.includes("you")) return "ou /uː/（you）";
    if (
      (normalizedWord.match(/[a-z]+/g) ?? []).some((token) =>
        token.endsWith("ous"),
      )
    ) {
      return "-ous /əs/";
    }
    if (normalizeKey(word).includes("should")) return null;
    return "ou/aʊ/";
  }
  if (pattern.type === "consonant_blend" && pattern.text === "th") {
    return ["both", "birthday", "mouth", "thank", "thanks", "thing", "three", "throw", "thursday"].some((part) =>
      normalizeKey(word).includes(part),
    )
      ? "th /θ/"
      : "th /ð/";
  }
  if (pattern.type === "r_controlled") return pattern.text;
  return pattern.text;
}

function tagsFor(entry) {
  const analysis = analyzeWordForStudy(entry.word);
  const tags = [];
  for (const pattern of analysis.patterns) {
    const name = tagNameForPattern(entry.word, pattern);
    if (!name) continue;
    tags.push({
      name,
      description: STATIC_TAG_DESCRIPTIONS[name] ?? pattern.explanation,
    });
  }

  const key = normalizeKey(entry.word);
  const alphaTokens = key.match(/[a-z]+/g) ?? [];
  if (alphaTokens.some((token) => token.endsWith("all"))) {
    tags.push({ name: "all /ɔːl/", description: STATIC_TAG_DESCRIPTIONS["all /ɔːl/"] });
  }
  if (alphaTokens.some((token) => token.endsWith("old"))) {
    tags.push({ name: "old /əʊld/", description: STATIC_TAG_DESCRIPTIONS["old /əʊld/"] });
  }
  if (alphaTokens.some((token) => token.endsWith("ing"))) {
    tags.push({ name: "ing/ɪŋ/", description: STATIC_TAG_DESCRIPTIONS["ing/ɪŋ/"] });
  }
  if (key.endsWith("ed")) {
    tags.push({ name: "-ed 词尾", description: STATIC_TAG_DESCRIPTIONS["-ed 词尾"] });
  }
  if (/[bcdfghjklmnpqrstvwxyz]y$/.test(key)) {
    const tagName =
      analysis.syllables.length === 1
        ? "辅音+y 单音节 /aɪ/"
        : "辅+y多音节";
    tags.push({ name: tagName, description: STATIC_TAG_DESCRIPTIONS[tagName] });
  }
  if (
    alphaTokens.some((token) =>
      /[aeiou]([bcdfghjklmnpqrstvwxyz])\1/i.test(token) &&
      !["all", "tall"].includes(token) &&
      !(
        token.endsWith("ball") &&
        !token.startsWith("volley")
      ),
    )
  ) {
    const tagName = "双写辅音，保护短元音";
    tags.push({ name: tagName, description: STATIC_TAG_DESCRIPTIONS[tagName] });
  }

  for (const tagName of MANUAL_TAGS_BY_WORD[key] ?? []) {
    tags.push({
      name: tagName,
      description: STATIC_TAG_DESCRIPTIONS[tagName],
    });
  }

  if (
    alphaTokens.length === 1 &&
    analysis.syllables.length === 1 &&
    !["all", "both", "cold", "most", "ok", "tall"].includes(key) &&
    !["climb", "dance", "fast", "grass", "sign", "talk", "want", "what"].includes(key) &&
    !analysis.patterns.some(({ type }) =>
      ["vowel_combo", "r_controlled", "magic_e"].includes(type),
    ) &&
    !tags.some(({ name }) => name.startsWith("VCe ") || name.includes("_e "))
  ) {
    const token = alphaTokens[0];
    const vowels = token.match(/[aeiou]/g) ?? [];
    if (vowels.length === 1 && /[bcdfghjklmnpqrstvwxyz]$/.test(token)) {
      const shortTag = {
        a: "闭音节 a /æ/",
        e: "闭音节 e /e/",
        i: "闭音节 i /ɪ/",
        o: "闭音节 o /ɒ/",
        u: "闭音节 u /ʌ/",
      }[vowels[0]];
      if (shortTag) {
        tags.push({
          name: shortTag,
          description: STATIC_TAG_DESCRIPTIONS[shortTag],
        });
      }
    }
  }

  const deduped = new Map();
  for (const tag of tags) {
    if (!deduped.has(tag.name)) deduped.set(tag.name, tag);
  }
  return [...deduped.values()].slice(0, 6);
}

function notesFor(entry, existingNotes) {
  const sourceLine = `教材关联：${textbookName}（${entry.units.join("、")}）。`;
  const currentSourcePattern = new RegExp(
    `教材关联：${escapeRegExp(textbookName)}（[^）]*）。?`,
    "g",
  );
  const previous = (existingNotes ?? "")
    .replace(currentSourcePattern, "")
    .trim();
  if (previous) return `${previous}\n${sourceLine}`;
  const division = formatSyllableDivision(entry.word);
  const patternText = tagsFor(entry)
    .map(({ name }) => name)
    .join("；");
  return [
    `音节拆分：${division || entry.word}。`,
    patternText ? `自然拼读重点：${patternText}。` : "",
    sourceLine,
  ]
    .filter(Boolean)
    .join("\n");
}

async function lookupDictionaryPhonetic(word) {
  const key = normalizeKey(word);
  if (PHONETIC_OVERRIDES[key]) return PHONETIC_OVERRIDES[key];
  const lookup = key.replace(/[.!?]+$/g, "");
  const youdaoResponse = await fetch(
    `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(lookup)}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!youdaoResponse.ok) {
    throw new Error(`${word}: dictionary HTTP ${youdaoResponse.status}`);
  }
  const payload = await youdaoResponse.json();
  const dictionaryWord = payload.ec?.word?.[0] ?? {};
  const candidates = [
    dictionaryWord.ukphone,
    dictionaryWord.usphone,
    dictionaryWord.phone,
  ];
  const phonetic = candidates.find(
    (value) => typeof value === "string" && value.trim().length > 2,
  );
  if (!phonetic) throw new Error(`${word}: dictionary returned no IPA`);
  const trimmed = phonetic.trim().replace(/^[/[]/, "").replace(/[/\]]$/, "");
  return `/${trimmed}/`;
}

async function downloadAudio(word) {
  const audioQuery = AUDIO_QUERY_OVERRIDES[normalizeKey(word)] ?? word;
  const failures = [];
  for (const type of [2, 1]) {
    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(audioQuery)}&type=${type}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.startsWith("audio/")) {
      failures.push(`type=${type}: HTTP ${response.status}, ${contentType || "unknown"}`);
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

const entries = buildEntries();
const expectedMembershipCount = units.reduce(
  (total, unit) => total + unit.words.length,
  0,
);
const expectedUnitCounts = new Map(
  units.map((unit) => [unit.name, unit.words.length]),
);
if (
  expectedMembershipCount !== expectedManifestMembershipCount ||
  entries.length !== expectedUniqueWordCount
) {
  throw new Error(
    `Manifest mismatch: ${entries.length} unique words, ${expectedMembershipCount} memberships`,
  );
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
const expectedKeys = entries.map((entry) => normalizeKey(entry.word));
const currentWords = await query(
  `SELECT w.*, g.textbookId primaryTextbookId
     FROM words w
LEFT JOIN word_groups g ON g.id = w.groupId
    WHERE w.userId = ? AND LOWER(TRIM(w.word)) IN (?)`,
  [catalogOwnerId, expectedKeys],
);
const currentByKey = new Map(
  currentWords.map((word) => [normalizeKey(word.word), word]),
);

const preview = {
  mode: apply ? "apply" : "dry-run",
  textbookExists: Boolean(existingTextbook),
  existingTextbookId: existingTextbook ? Number(existingTextbook.id) : null,
  existingGroupCount: existingGroups.length,
  expectedUnitCount: units.length,
  expectedUniqueWords: entries.length,
  expectedMemberships: expectedMembershipCount,
  existingUniqueWords: currentByKey.size,
  wordsToInsert: entries
    .filter((entry) => !currentByKey.has(normalizeKey(entry.word)))
    .map((entry) => entry.word),
  sourceExampleCoverage: {
    withThree: entries.filter((entry) => entry.examples.length === 3).length,
    withTwo: entries.filter((entry) => entry.examples.length === 2).length,
    withOne: entries.filter((entry) => entry.examples.length === 1).length,
    withOneWords: entries
      .filter((entry) => entry.examples.length === 1)
      .map((entry) => entry.word),
    withNone: entries.filter((entry) => entry.examples.length === 0).map((entry) => entry.word),
  },
};
console.log(JSON.stringify(preview, null, 2));

if (!apply) {
  await connection.end();
  process.exit(0);
}

const phoneticByKey = new Map();
const phoneticQueue = entries.filter(
  (entry) => !currentByKey.get(normalizeKey(entry.word))?.phonetic,
);
const phoneticFailures = [];
const phoneticWorkers = Array.from(
  { length: Math.min(8, phoneticQueue.length) },
  async () => {
    while (phoneticQueue.length > 0) {
      const entry = phoneticQueue.shift();
      try {
        phoneticByKey.set(
          normalizeKey(entry.word),
          await lookupDictionaryPhonetic(entry.word),
        );
      } catch (error) {
        phoneticFailures.push({ word: entry.word, error: error.message });
      }
    }
  },
);
await Promise.all(phoneticWorkers);
if (phoneticFailures.length > 0) {
  await connection.end();
  throw new Error(
    `Missing IPA for ${phoneticFailures.length} words: ${JSON.stringify(phoneticFailures)}`,
  );
}

const affectedWordIds = currentWords.map((word) => Number(word.id));
const backup = {
  createdAt: new Date().toISOString(),
  catalogOwnerId,
  textbook: existingTextbook ?? null,
  groups: existingGroups,
  words: currentWords,
  links:
    affectedWordIds.length > 0
      ? await query(
          "SELECT * FROM word_group_links WHERE wordId IN (?) ORDER BY id",
          [affectedWordIds],
        )
      : [],
  wordTags:
    affectedWordIds.length > 0
      ? await query(
          "SELECT * FROM word_tags WHERE wordId IN (?) ORDER BY id",
          [affectedWordIds],
        )
      : [],
  audioMetadata:
    affectedWordIds.length > 0
      ? await query(
          "SELECT id, wordId, format, source, createdAt, updatedAt, LENGTH(audioData) audioDataLength FROM word_audios WHERE wordId IN (?) ORDER BY id",
          [affectedWordIds],
        )
      : [],
};
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const backupDirectory = join(projectRoot, "backups");
await mkdir(backupDirectory, { recursive: true });
const timestamp = backup.createdAt.replaceAll(":", "-").replaceAll(".", "-");
const backupPath = join(
  backupDirectory,
  `${datasetSlug}-sync-${timestamp}.json`,
);
const backupJson = JSON.stringify(backup, null, 2);
await writeFile(backupPath, backupJson, "utf8");
console.log(
  JSON.stringify({
    phase: "backup",
    backupPath,
    backupSha256: createHash("sha256").update(backupJson).digest("hex"),
  }),
);

let textbookId;
const groupIdByUnit = new Map();
const importedWordIds = [];

await connection.beginTransaction();
try {
  if (existingTextbook) {
    textbookId = Number(existingTextbook.id);
    await query(
      "UPDATE textbooks SET description = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
      [
        textbookDescription,
        textbookId,
      ],
    );
  } else {
    const [sortRow] = await query(
      "SELECT COALESCE(MAX(sortOrder), -1) maxSortOrder FROM textbooks WHERE userId = ?",
      [catalogOwnerId],
    );
    const result = await query(
      `INSERT INTO textbooks (userId, name, description, isDefault, sortOrder)
       VALUES (?, ?, ?, 0, ?)`,
      [
        catalogOwnerId,
        textbookName,
        textbookDescription,
        Number(sortRow.maxSortOrder) + 1,
      ],
    );
    textbookId = Number(result.insertId);
  }

  const databaseGroups = await query(
    "SELECT * FROM word_groups WHERE userId = ? AND textbookId = ? ORDER BY id",
    [catalogOwnerId, textbookId],
  );
  const groupByKey = new Map(
    databaseGroups.map((group) => [normalizeKey(group.name).replaceAll(" ", ""), group]),
  );
  for (const [index, unit] of units.entries()) {
    const key = normalizeKey(unit.name).replaceAll(" ", "");
    const existingGroup = groupByKey.get(key);
    let groupId;
    if (existingGroup) {
      groupId = Number(existingGroup.id);
      await query(
        "UPDATE word_groups SET name = ?, sortOrder = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
        [unit.name, index, groupId],
      );
    } else {
      const result = await query(
        `INSERT INTO word_groups (userId, textbookId, name, sortOrder)
         VALUES (?, ?, ?, ?)`,
        [catalogOwnerId, textbookId, unit.name, index],
      );
      groupId = Number(result.insertId);
    }
    groupIdByUnit.set(unit.name, groupId);
  }

  const expectedGroupIds = new Set(groupIdByUnit.values());
  for (const group of databaseGroups) {
    if (!expectedGroupIds.has(Number(group.id))) {
      await query("DELETE FROM word_groups WHERE id = ? AND textbookId = ?", [
        group.id,
        textbookId,
      ]);
    }
  }

  const expectedGroupsByWord = new Map(
    entries.map((entry) => [
      normalizeKey(entry.word),
      new Set(entry.units.map((unit) => groupIdByUnit.get(unit))),
    ]),
  );
  const legacyLinks = await query(
    `SELECT link.id, link.wordId, link.groupId, w.word
       FROM word_group_links link
       JOIN word_groups g ON g.id = link.groupId
       JOIN words w ON w.id = link.wordId
      WHERE g.textbookId = ?`,
    [textbookId],
  );
  for (const link of legacyLinks) {
    const expectedGroups = expectedGroupsByWord.get(normalizeKey(link.word));
    if (!expectedGroups?.has(Number(link.groupId))) {
      await query("DELETE FROM word_group_links WHERE id = ?", [link.id]);
    }
  }

  const tagIdByName = new Map();
  const allTags = new Map(
    entries.flatMap((entry) =>
      tagsFor(entry).map((tag) => [tag.name, tag]),
    ),
  );
  for (const tag of allTags.values()) {
    const [existingTag] = await query(
      "SELECT id, description FROM tags WHERE userId = ? AND name = ? ORDER BY id LIMIT 1",
      [catalogOwnerId, tag.name],
    );
    let tagId;
    if (existingTag) {
      tagId = Number(existingTag.id);
      if (!existingTag.description && tag.description) {
        await query("UPDATE tags SET description = ? WHERE id = ?", [
          tag.description,
          tagId,
        ]);
      }
    } else {
      const result = await query(
        "INSERT INTO tags (userId, name, description) VALUES (?, ?, ?)",
        [catalogOwnerId, tag.name, tag.description || null],
      );
      tagId = Number(result.insertId);
    }
    tagIdByName.set(tag.name, tagId);
  }

  for (const [index, entry] of entries.entries()) {
    const key = normalizeKey(entry.word);
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
      const primaryGroupId =
        existing.groupId === null ||
        existing.primaryTextbookId === null ||
        Number(existing.primaryTextbookId) === textbookId ||
        outsideLinks.length === 0
          ? desiredGroupIds[0]
          : Number(existing.groupId);
      await query(
        `UPDATE words
            SET groupId = ?, phonetic = ?, definition = ?, example = ?, notes = ?,
                updatedAt = CURRENT_TIMESTAMP
          WHERE id = ? AND userId = ?`,
        [
          primaryGroupId,
          existing.phonetic || phoneticByKey.get(key),
          existing.definition?.trim() || entry.definition,
          mergeMultiline(existing.example, entry.example),
          notesFor(entry, existing.notes),
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
          phoneticByKey.get(key),
          entry.definition,
          entry.example || null,
          notesFor(entry, null),
        ],
      );
      wordId = Number(result.insertId);
    }
    importedWordIds.push(wordId);

    for (const groupId of desiredGroupIds) {
      await query(
        "INSERT IGNORE INTO word_group_links (wordId, groupId) VALUES (?, ?)",
        [wordId, groupId],
      );
    }
    for (const legacyTagName of LEGACY_TAGS_TO_REMOVE_BY_WORD[key] ?? []) {
      await query(
        `DELETE wt
           FROM word_tags wt
           JOIN tags t ON t.id = wt.tagId
          WHERE wt.wordId = ? AND t.userId = ? AND t.name = ?`,
        [wordId, catalogOwnerId, legacyTagName],
      );
    }
    for (const tag of tagsFor(entry)) {
      const tagId = tagIdByName.get(tag.name);
      await query(
        `INSERT INTO word_tags (wordId, tagId)
         SELECT ?, ? WHERE NOT EXISTS (
           SELECT 1 FROM word_tags WHERE wordId = ? AND tagId = ?
         )`,
        [wordId, tagId, wordId, tagId],
      );
    }

    if ((index + 1) % 25 === 0 || index === entries.length - 1) {
      console.log(
        JSON.stringify({
          phase: "words",
          completed: index + 1,
          total: entries.length,
        }),
      );
    }
  }

  await query(
    `UPDATE words w
     LEFT JOIN word_group_links currentLink
       ON currentLink.wordId = w.id AND currentLink.groupId = w.groupId
     LEFT JOIN (
       SELECT wordId, MIN(groupId) fallbackGroupId
         FROM word_group_links
        GROUP BY wordId
     ) fallback ON fallback.wordId = w.id
        SET w.groupId = fallback.fallbackGroupId
      WHERE w.userId = ?
        AND w.groupId IS NOT NULL
        AND currentLink.id IS NULL`,
    [catalogOwnerId],
  );

  await connection.commit();
  console.log(JSON.stringify({ phase: "database", status: "committed" }));
} catch (error) {
  await connection.rollback();
  await connection.end();
  throw error;
}

const missingAudio = await query(
  `SELECT DISTINCT w.id, w.word
     FROM words w
LEFT JOIN word_audios a ON a.wordId = w.id
    WHERE w.id IN (?) AND a.id IS NULL
    ORDER BY w.id`,
  [importedWordIds],
);
const audioResults = [];
const audioQueue = [...missingAudio];
const audioWorkers = Array.from(
  { length: Math.min(8, audioQueue.length) },
  async () => {
    while (audioQueue.length > 0) {
      const word = audioQueue.shift();
      try {
        const buffer = await downloadAudio(word.word);
        const [existingAudio] = await query(
          "SELECT id FROM word_audios WHERE wordId = ? LIMIT 1",
          [word.id],
        );
        if (!existingAudio) {
          await query(
            `INSERT INTO word_audios (wordId, audioData, format, source)
             VALUES (?, ?, 'mp3', 'youdao')`,
            [word.id, buffer.toString("base64")],
          );
        }
        audioResults.push({
          word: word.word,
          status: "inserted",
          bytes: buffer.length,
        });
      } catch (error) {
        audioResults.push({
          word: word.word,
          status: "failed",
          error: error.message,
        });
      }
    }
  },
);
await Promise.all(audioWorkers);

const groupAudit = await query(
  `SELECT g.name unit, g.sortOrder,
          COUNT(link.id) membershipCount,
          COUNT(DISTINCT link.wordId) uniqueWordCount
     FROM word_groups g
LEFT JOIN word_group_links link ON link.groupId = g.id
    WHERE g.textbookId = ?
    GROUP BY g.id, g.name, g.sortOrder
    ORDER BY g.sortOrder`,
  [textbookId],
);
const membershipRows = await query(
  `SELECT g.name unit, LOWER(TRIM(w.word)) wordKey, w.word,
          w.phonetic, w.example, w.notes,
          COUNT(DISTINCT a.id) audioCount,
          COUNT(DISTINCT wt.tagId) tagCount,
          GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR '|||') tagNames
     FROM word_group_links link
     JOIN word_groups g ON g.id = link.groupId
     JOIN words w ON w.id = link.wordId
LEFT JOIN word_audios a ON a.wordId = w.id
LEFT JOIN word_tags wt ON wt.wordId = w.id
LEFT JOIN tags t ON t.id = wt.tagId
    WHERE g.textbookId = ? AND w.userId = ?
    GROUP BY g.id, g.name, w.id
    ORDER BY g.sortOrder, w.word`,
  [textbookId, catalogOwnerId],
);
const expectedMemberships = new Set(
  entries.flatMap((entry) =>
    entry.units.map((unit) => `${unit}|${normalizeKey(entry.word)}`),
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
const wrongUnitCounts = groupAudit.filter(
  (group) =>
    Number(group.membershipCount) !== Number(expectedUnitCounts.get(group.unit)),
);
const membershipByWordKey = new Map(
  membershipRows.map((row) => [row.wordKey, row]),
);
const semanticTagIssues = Object.entries(PHONICS_TAG_ASSERTIONS_BY_WORD)
  .filter(([wordKey]) => membershipByWordKey.has(wordKey))
  .flatMap(([wordKey, assertion]) => {
    const row = membershipByWordKey.get(wordKey);
    const actual = new Set(
      (row.tagNames ?? "").split("|||").filter(Boolean),
    );
    return [
      ...assertion.required
        .filter((tagName) => !actual.has(tagName))
        .map((tagName) => ({
          word: row.word,
          issue: "missing-required-tag",
          tagName,
        })),
      ...assertion.forbidden
        .filter((tagName) => actual.has(tagName))
        .map((tagName) => ({
          word: row.word,
          issue: "forbidden-tag-present",
          tagName,
        })),
    ];
  });
const audit = {
  textbookId,
  textbookName,
  unitCount: groupAudit.length,
  uniqueWordCount: new Set(membershipRows.map((row) => row.wordKey)).size,
  membershipCount: membershipRows.length,
  groups: groupAudit,
  missingMemberships,
  unexpectedMemberships,
  wrongUnitCounts,
  missingPhonetics: membershipRows
    .filter((row) => !row.phonetic)
    .map((row) => row.word),
  missingExamples: membershipRows
    .filter((row) => !row.example)
    .map((row) => row.word),
  missingAudio: membershipRows
    .filter((row) => Number(row.audioCount) === 0)
    .map((row) => row.word),
  missingTags: membershipRows
    .filter((row) => Number(row.tagCount) === 0)
    .map((row) => row.word),
  semanticTagIssues,
  audioFailures: audioResults.filter((result) => result.status === "failed"),
};
console.log(JSON.stringify({ phase: "audit", ...audit }, null, 2));

if (
  audit.unitCount !== units.length ||
  audit.uniqueWordCount !== expectedUniqueWordCount ||
  audit.membershipCount !== expectedMembershipCount ||
  audit.missingMemberships.length > 0 ||
  audit.unexpectedMemberships.length > 0 ||
  audit.wrongUnitCounts.length > 0 ||
  audit.missingPhonetics.length > 0 ||
  audit.missingExamples.length > 0 ||
  audit.missingAudio.length > 0 ||
  audit.missingTags.length > 0 ||
  audit.semanticTagIssues.length > 0 ||
  audit.audioFailures.length > 0
) {
  await connection.end();
  throw new Error("Post-import audit failed");
}

await connection.end();
