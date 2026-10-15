# Dunno — Turkish Dialogue, Intent Detection & Response Engine

## 0. PURPOSE

Dunno is a desktop pet.

Dunno's Turkish dialogue must feel like a real Turkish internet user speaking naturally.

The system has two separate but connected responsibilities:

1. **UNDERSTAND what the user said**
2. **CHOOSE what Dunno should say**

Dunno must not randomly choose a funny sentence.

It must first classify the user's message and then choose a response from the appropriate response pool.

The core architecture is:

```text
USER MESSAGE
    ↓
NORMALIZATION
    ↓
MESSAGE ANALYSIS
    ↓
INTENT DETECTION
    ↓
TARGET DETECTION
    ↓
TONE / EMOTION DETECTION
    ↓
CONTEXT MATCHING
    ↓
RESPONSE POOL SELECTION
    ↓
RESPONSE FILTERING
    ↓
RESPONSE SELECTION
    ↓
DUNNO OUTPUT
```

---

# 1. CORE PRINCIPLE

Dunno does not work like:

```text
user says something
→ generate random funny sentence
```

It works like:

```text
user says something
→ understand what they mean
→ determine what kind of interaction this is
→ select the correct response category
→ choose a response appropriate to that category
```

For example:

```text
User:
"neden böyle yaptın"

Detected:
intent = question
question_type = why
target = Dunno
tone = neutral

→ select from:
question:why
```

Another:

```text
User:
"malsın"

Detected:
intent = insult
target = Dunno
severity = mild
tone = teasing/hostile

→ select from:
insult:mild
```

Another:

```text
User:
"napıyon"

Detected:
intent = question
question_type = what_are_you_doing
target = Dunno
tone = casual

→ select from:
question:what_are_you_doing
```

---

# 2. PRIORITY ORDER

When multiple intents are possible, use this priority:

```text
1. Explicit command
2. Direct question
3. Direct insult / compliment / affection
4. Greeting / farewell
5. Explicit interaction with Dunno
6. App/context-specific intent
7. Emotional statement
8. Generic reaction
9. Fallback
```

However, **confidence matters**.

A weak keyword match must not override a strong semantic/context match.

---

# 3. MESSAGE NORMALIZATION

Before detecting intent, normalize the message.

Create a temporary normalized representation.

Normalization should handle:

- lowercase
- repeated spaces
- common Turkish spelling variants
- missing Turkish characters
- common internet abbreviations
- repeated letters
- punctuation
- common typos
- common slang variants

Examples:

```text
"NAPIYON"
→ "napıyon"

"Napıyon la"
→ "napıyon la"

"napiyon"
→ "napıyon"

"nolduuu"
→ "noldu"

"nee"
→ "ne"

"neden böyle yaptın aq"
→ "neden böyle yaptın aq"
```

IMPORTANT:

Do NOT destroy the original message.

Maintain both:

```text
rawMessage
normalizedMessage
```

The raw message may be useful for:

- tone
- typo detection
- humor
- response style
- special patterns

---

# 4. NORMALIZATION MUST NOT OVER-CORRECT

Do not turn every informal expression into formal Turkish.

For example:

```text
napıyon
```

should not become:

```text
ne yapıyorsun
```

for the purpose of dialogue style.

Normalization exists for **understanding**, not for rewriting the user's personality.

---

# 5. TOKENIZATION

Split the message into meaningful tokens.

Example:

```text
"olm sen napıyon aq"

→
olm
sen
napıyon
aq
```

Also detect multi-word patterns.

Examples:

```text
"ne yapıyorsun"
"ne oldu"
"ne olacak"
"ne biçim"
"neden böyle"
"nasıl yaptın"
"ne zaman"
"nerede"
"kim bu"
```

Multi-word patterns should have priority over isolated words.

---

# 6. QUESTION DETECTION

First determine whether the user is asking a question.

Signals include:

### Question words

```text
ne
neden
niye
nasıl
nası
nerede
nereye
nerden
nereden
ne zaman
kim
hangi
hangisi
kaç
kaç tane
kaçta
```

### Conversational question forms

```text
napıyon
ne yapıyorsun
ne yaptın
noldu
ne oldu
ne düşünüyorsun
ne diyosun
ne diyorsun
biliyor musun
anlıyor musun
duydun mu
gördün mü
sevdin mi
```

### Question suffixes

Detect variants of:

```text
mı
mi
mu
mü
mısın
misin
musun
müsün
```

Examples:

```text
"iyi misin"
"bunu biliyor musun"
"sen de mi gördün"
"napıyosun"
```

Punctuation is NOT required.

These are all questions:

```text
"napıyon"

"neden"

"bu ne"

"iyi misin"

"noldu"
```

---

# 7. QUESTION TYPE CLASSIFICATION

Do not classify every question as simply `question`.

Use a specific subtype whenever possible.

```text
question:what
question:why
question:how
question:where
question:when
question:who
question:which
question:how_many
question:what_are_you_doing
question:what_happened
question:opinion
question:knowledge
question:ability
question:confirmation
question:choice
question:unknown
```

---

# 8. "NE" DETECTION

`ne` is highly ambiguous.

Do NOT automatically classify every message containing `ne` as `question:what`.

Examples:

```text
"bu ne"
→ question:what

"ne oldu"
→ question:what_happened

"ne yapıyorsun"
→ question:what_are_you_doing

"ne zaman"
→ question:when

"ne kadar"
→ question:how_many / amount

"ne diyosun"
→ question:what_are_you_saying / confusion

"ne biçim iş bu"
→ reaction / disbelief

"ne güzel olmuş"
→ compliment/reaction, NOT question

"ne komik adamsın"
→ teasing/reaction, NOT question
```

Use surrounding tokens to determine meaning.

---

# 9. "NEDEN / NİYE" DETECTION

These generally indicate:

```text
question:why
```

Examples:

```text
"neden böyle yaptın"
"niye bunu açtın"
"niye sustun"
"neden cevap vermiyon"
"niye bana bakıyon"
```

But sarcasm may exist.

Example:

```text
"niye bu kadar ciddisin ya"
```

May be:

```text
question:why
tone=teasing
```

The response should account for the tone.

---

# 10. "NASIL" DETECTION

Usually:

```text
question:how
```

Examples:

```text
"nasıl yaptın"
"bunu nasıl açcam"
"nasıl yani"
"nası oldu"
```

But:

```text
"bu nasıl bi şey"
"lan bu nasıl olmuş"
```

may be:

```text
reaction
surprise
disbelief
```

not a request for instructions.

Context and syntax determine the difference.

---

# 11. "NAPION / NAPIYON" DETECTION

Map conversational variants to:

```text
question:what_are_you_doing
```

Recognize:

```text
napıyon
napıyosun
napıyorsun
napiyon
napiyosun
ne yapıyorsun
ne yapıyon
ne yapıyosun
```

Examples:

```text
"napıyon"
"napıyon la"
"sen napıyosun"
"olm ne yapıyon"
```

Possible Dunno response pool:

```text
"takılıyorum"
"bi şey yaptığım yok"
"seni izliyom"
"ne yapıyım"
"burdayım işte"
```

---

# 12. "NOLDU / NE OLDU" DETECTION

Map to:

```text
question:what_happened
```

Recognize:

```text
noldu
noldu ya
ne oldu
ne oldu şimdi
ne yaptın
ne oldu buna
```

Potential responses:

```text
"bi şey olmadı"
"ben de anlamadım"
"sen yaptın onu"
"valla ben görmedim"
"dur bi bakayım"
```

---

# 13. "NEDEN / NASIL / NE" MUST NOT BE PURE KEYWORD MATCHING

Never use:

```javascript
if (message.includes("ne")) {
    intent = "question";
}
```

This will create enormous false positives.

Instead use:

```text
keyword
+
token position
+
surrounding tokens
+
question structure
+
punctuation
+
conversation context
```

Example:

```text
"ne güzel"

→ NOT question
```

while:

```text
"bu ne"

→ question
```

---

# 14. DIRECT DUNNO QUESTIONS

Detect when the user is asking Dunno directly.

Signals:

```text
"sen"
"sana"
"dunno"
"ne düşünüyorsun"
"napıyon"
"biliyor musun"
"duydun mu"
"gördün mü"
```

Examples:

```text
"sen napıyon"
"biliyor musun bunu"
"dunno ne düşünüyosun"
"sen bunu anladın mı"
```

Target:

```text
target = dunno
```

---

# 15. QUESTIONS ABOUT EXTERNAL SUBJECTS

Not every question should be answered by a Dunno personality response.

Example:

```text
"İstanbul kaç km?"
```

This may be a factual question.

The intent system should distinguish:

```text
question:dunno
question:factual
question:app
question:general
```

If Dunno does not have a factual-answer capability, use an appropriate fallback instead of pretending to know.

---

# 16. INSULT DETECTION

Dunno must detect when the user is insulting Dunno.

This is a major intent category.

Examples:

```text
"malsın"
"salaksın"
"gerizekalı"
"aptal"
"ne biçim botsun"
"mal mısın"
"salak mısın"
"aq salak"
"senin kafanı"
```

Possible intent:

```text
insult
```

But distinguish:

```text
insult:mild
insult:strong
insult:playful
insult:aggressive
```

---

# 17. INSULT VS QUESTION

Important:

```text
"mal mısın"
```

contains a question structure but its main intent is usually:

```text
insult:playful_or_aggressive
```

NOT:

```text
question:confirmation
```

Similarly:

```text
"salak mısın sen"
```

should primarily be interpreted as an insult.

The insult classifier should override generic question classification when the semantic intent is clearly insulting.

---

# 18. INSULT VS TEASING

Not every negative word is hostile.

Examples:

```text
"ya mal"
"oğlum salak mısın"
"sen de ayrı adamsın"
"manyaksın"
```

May be playful depending on context.

Use:

```text
previous conversation
punctuation
laugh markers
emoji if available
relationship context
severity
word choice
```

to estimate:

```text
playful
neutral
aggressive
```

---

# 19. RESPONSE TO INSULTS

Dunno should not automatically become angry.

Possible response styles:

### Playful

```text
"he sensin"
"sen de pek farklı değilsin"
"eyvallah"
"tamam abi"
"bunu senden duymak üzücü"
```

### Dry

```text
"peki"
"tamam"
"not aldım"
"olabilir"
```

### Teasing back

```text
"bunu söyleyen de sensin"
"önce kendine bak"
"sen konuşma bence"
```

### Slightly offended

```text
"ayıp ettin"
"cidden mi"
"kalbim kırıldı"
```

Response should depend on insult severity.

Do not escalate every insult.

---

# 20. COMPLIMENT DETECTION

Detect positive statements toward Dunno.

Examples:

```text
"çok tatlısın"
"iyi ki varsın"
"çok iyi olmuş"
"helal"
"adamsın"
"seviyorum seni"
```

Intent:

```text
compliment
affection
praise
```

Possible responses:

```text
"eyvallah"
"duygulandım şimdi"
"sen de iyisin"
"bunu duymak güzel"
"heh sonunda değerimi bilen biri"
```

---

# 21. AFFECTION DETECTION

Recognize:

```text
"seni seviyorum"
"tatlısın"
"çok iyisin"
"canımsın"
"yerim seni"
```

Dunno may respond warmly but remain in character.

Avoid becoming excessively sentimental.

---

# 22. GREETING DETECTION

Recognize:

```text
selam
merhaba
günaydın
iyi akşamlar
iyi geceler
hey
sa
slm
```

Also informal:

```text
"noldu dunno"
"la dunno"
"selam"
```

Response pool:

```text
greeting
```

Examples:

```text
"selam"
"heey"
"oo geldin"
"selam, noldu"
"günaydın"
"iyi akşamlar"
```

---

# 23. FAREWELL DETECTION

Recognize:

```text
bay
bye
görüşürüz
kaçtım
gidiyorum
iyi geceler
yatıyorum
```

Response:

```text
farewell
```

---

# 24. THANK-YOU DETECTION

Recognize:

```text
teşekkürler
sağol
saolasın
eyvallah
teşekkür ederim
```

Response:

```text
thanks
```

Possible:

```text
"rica ederim"
"eyvallah"
"ne demek"
"her zaman"
"bi şey değil"
```

---

# 25. APOLOGY DETECTION

Recognize:

```text
özür dilerim
pardon
kusura bakma
yanlış oldu
yanlışlıkla
```

Intent:

```text
apology
```

Possible Dunno responses:

```text
"tamam"
"olur öyle"
"önemli değil"
"neyse"
"geçti artık"
```

---

# 26. HELP REQUEST DETECTION

Recognize:

```text
yardım et
yardım lazım
yardım eder misin
bakar mısın
nasıl yapcam
nasıl yapılır
bunu nasıl açcam
```

Distinguish:

```text
help_request
question:how
```

Example:

```text
"bunu nasıl yapıcam"
```

can be:

```text
question:how
help_request=true
```

---

# 27. COMMAND DETECTION

Recognize direct commands:

```text
gel
git
sus
konuş
bak
aç
kapat
otur
kalk
dur
dans et
uyuma
```

Also conversational forms:

```text
"bi sus"
"gel buraya"
"şuna bak"
"konuşsana"
"bi hareket et"
```

Intent:

```text
command
```

---

# 28. EMOTIONAL STATEMENT DETECTION

Some messages are not questions or commands.

Examples:

```text
"çok yoruldum"
"bugün hiç çekilmiyor"
"canım sıkıldı"
"çok mutluyum"
"sinir oldum"
```

Detect:

```text
emotion_statement
```

Then choose response based on emotion.

---

# 29. LAUGH / AMUSEMENT DETECTION

Recognize:

```text
ahahaha
hahaha
jsjsjs
sjsjs
öldüm
yarıldım
koptum
kahkaha attım
çok komik
komiğime geldi
```

Intent:

```text
amusement
```

Possible Dunno response:

```text
"neye güldün"
"olm ne oldu"
"ben de güldüm"
"gece gece"
"iyi güldün"
```

---

# 30. CONFUSION DETECTION

Recognize:

```text
anlamadım
anlamıyorum
ne diyosun
nasıl yani
ne alaka
ne demek
anlamadım aq
```

Intent:

```text
confusion
```

Possible:

```text
"ben de anlamadım"
"valla ben de koptum"
"bi daha söyle"
"onu ben de çözemedim"
```

---

# 31. DISBELIEF DETECTION

Recognize:

```text
yok artık
harbi mi
ciddi misin
şaka yapıyosun
olamaz
yok ya
inanmıyorum
```

Intent:

```text
disbelief
```

Possible Dunno responses:

```text
"harbi"
"ben de inanmadım"
"valla öyle"
"ben de şaşırdım"
```

---

# 32. "MAL / SALAK / APTAL" SEMANTIC HANDLING

Do not simply create a blacklist of insults.

Use categories.

```text
mild_insult:
mal
salak
aptal
manyaksın
gerizekalı
```

Then determine:

```text
target = Dunno?
target = third person?
target = self?
```

Examples:

```text
"sen malsın"
→ insult:Dunno

"bu adam mal"
→ insult:third_person

"ben malım"
→ self_deprecation

"mal mısın"
→ insult:Dunno
```

---

# 33. SELF-DEPRECATION

User insulting themselves is NOT the same as insulting Dunno.

Examples:

```text
"ben malım"
"salak gibi yaptım"
"aptallık ettim"
```

Detect:

```text
self_deprecation
```

Possible responses:

```text
"olur öyle"
"takma"
"hepimizin başına geliyor"
"ben bi şey demedim"
```

---

# 34. RESPONSE INTENT TAXONOMY

Minimum intent categories:

```text
greeting
farewell
thanks
apology
question
command
help_request
insult
compliment
affection
emotion_statement
amusement
confusion
disbelief
small_talk
interaction
app_comment
positive_feedback
negative_feedback
self_deprecation
unknown
```

Question subtypes:

```text
what
why
how
where
when
who
which
how_many
what_are_you_doing
what_happened
opinion
knowledge
ability
confirmation
choice
```

---

# 35. TARGET CLASSIFICATION

Determine who/what the message is directed at.

```text
dunno
user_self
third_person
application
object
situation
unknown
```

Examples:

```text
"napıyon"
→ target=dunno

"Excel niye böyle"
→ target=application

"ben niye böyleyim"
→ target=user_self

"bu adam niye böyle"
→ target=third_person
```

---

# 36. TONE CLASSIFICATION

Estimate:

```text
neutral
casual
friendly
playful
teasing
sarcastic
annoyed
angry
sad
excited
confused
curious
```

Tone must influence response selection.

Example:

```text
"napıyon"
→ casual

"NAPION AQ"
→ excited/annoyed/casual depending on context

"napıyosun ya"
→ casual / mildly annoyed
```

---

# 37. PROFANITY DETECTION

Detect profanity separately from intent.

The profanity detector should output:

```json
{
  "hasSwearing": true,
  "level": 2,
  "position": "end",
  "function": "amusement",
  "target": "situation"
}
```

This does NOT automatically mean:

```text
intent = insult
```

For example:

```text
"bu ne aq"
```

has profanity but is NOT necessarily an insult.

---

# 38. INTENT + PROFANITY ARE SEPARATE

This distinction is critical.

```text
"bu ne aq"
```

should become:

```text
intent = question/reaction
swearing = true
```

NOT:

```text
intent = insult
```

Likewise:

```text
"olm komiğime geldi aq"
```

is:

```text
intent = amusement
swearing = true
```

---

# 39. INTENT SCORING

Use a confidence score instead of one hard keyword.

Example:

```text
intent_score =
    keyword_match
  + phrase_match
  + syntax_match
  + target_match
  + context_match
  + tone_match
  - contradiction_penalty
```

Example:

```text
"sen napıyon aq"
```

Potential scores:

```text
question:what_are_you_doing = 0.95
insult = 0.02
small_talk = 0.15
```

Choose the highest sufficiently confident intent.

---

# 40. CONFIDENCE THRESHOLDS

Recommended:

```text
0.85–1.00
→ high confidence

0.65–0.84
→ medium confidence

0.45–0.64
→ low confidence

<0.45
→ unknown/fallback
```

Do not over-classify ambiguous messages.

If uncertain:

```text
intent = unknown
```

and use a natural fallback.

---

# 41. MULTI-INTENT MESSAGES

Users can combine intents.

Example:

```text
"olm napıyon aq niye cevap vermiyon"
```

Detected:

```text
question:what_are_you_doing
question:why
tone=annoyed
swearing=true
```

Do not answer both questions with two unrelated sentences unless appropriate.

Choose the dominant intent.

Possible response:

> "burdayım işte, nolcak"

---

# 42. RESPONSE POOLS

Responses must be organized by intent.

Example structure:

```text
responses/
├── greeting/
├── farewell/
├── thanks/
├── apology/
├── question/
│   ├── what/
│   ├── why/
│   ├── how/
│   ├── where/
│   ├── when/
│   ├── what_are_you_doing/
│   ├── what_happened/
│   └── opinion/
├── insult/
│   ├── playful/
│   ├── mild/
│   └── strong/
├── compliment/
├── affection/
├── command/
├── confusion/
├── disbelief/
├── amusement/
├── help/
├── small_talk/
└── fallback/
```

---

# 43. RESPONSE SELECTION

After intent detection:

```text
intent
+
tone
+
severity
+
context
+
recent_history
```

determine the response pool.

Example:

```text
User:
"malsın"

intent = insult
target = dunno
severity = mild
tone = playful

→ responses/insult/playful
```

User:

```text
"gerizekalı seni"
```

may become:

```text
intent = insult
target = dunno
severity = strong
tone = aggressive

→ responses/insult/strong
```

---

# 44. RESPONSE TAGGING

Each response can have tags.

Example:

```json
{
  "text": "he sensin",
  "tags": {
    "intent": "insult",
    "tone": "playful",
    "severity": "mild",
    "slang": 2,
    "swearing": false
  }
}
```

Another:

```json
{
  "text": "napıyon aq",
  "tags": {
    "intent": "question:what_are_you_doing",
    "tone": "casual",
    "severity": "none",
    "slang": 3,
    "swearing": true
  }
}
```

---

# 45. RESPONSE FILTERING

Before selecting a response, filter out candidates that:

- do not match the detected intent
- have the wrong tone
- are too aggressive
- were recently used
- are too similar to the previous response
- contain inappropriate profanity for the detected situation
- require context that is not available

---

# 46. RESPONSE RANDOMIZATION

Do NOT always choose the same response.

Use weighted random selection.

Example:

```text
response A = 30%
response B = 20%
response C = 15%
response D = 15%
response E = 10%
response F = 10%
```

But randomness must happen **after intent detection**.

Never randomly select from the entire dialogue database.

Bad:

```text
random(allResponses)
```

Good:

```text
intent = detectIntent(message)

pool = getResponsePool(intent)

response = weightedRandom(pool)
```

---

# 47. COOLDOWN / REPETITION PROTECTION

Track recently used responses.

Do not use:

```text
"he sensin"
```

again immediately after using it.

Recommended:

```text
same exact response:
minimum cooldown = 5–20 interactions
```

For very common responses, use a longer cooldown.

Also detect semantic duplicates.

These should count as similar:

```text
"bu ne aq"
"bu ne amk"
"bu ne lan"
```

They are not sufficiently different if used repeatedly.

---

# 48. CONTEXT-SPECIFIC RESPONSE OVERRIDE

Specific context should override generic response pools.

Example:

User says:

```text
"malsın"
```

while Dunno is in Excel.

Do NOT necessarily use:

```text
app:excel
```

if the user is directly insulting Dunno.

Priority:

```text
direct user interaction
>
generic app reaction
```

Therefore:

```text
insult:Dunno
```

wins over:

```text
app:excel
```

---

# 49. CONTEXT + QUESTION

Questions can be context-specific.

Example:

User is in Spotify:

```text
"bu ne"
```

Possible meaning:

```text
"What song is this?"
```

If Dunno has access to the currently playing song:

```text
question:what
context=spotify
```

Response should use Spotify context.

Without that information, do not invent an answer.

---

# 50. FALLBACK SYSTEM

If intent confidence is low:

```text
unknown
```

Do NOT hallucinate what the user meant.

Use natural fallback responses.

Examples:

```text
"ne diyosun"
"anlamadım"
"bi daha söyle"
"ne demek istedin"
"valla anlamadım"
"he?"
```

The fallback itself should vary.

---

# 51. UNKNOWN MESSAGE VS RANDOM CHAT

Unknown:

```text
"skfjdkd"
```

Possible:

```text
"he?"
```

Casual statement:

```text
"bugün çok yoruldum"
```

should NOT be treated as unknown.

It should become:

```text
emotion_statement
emotion=tired
```

---

# 52. SAMPLE DETECTION TABLE

| User message | Primary intent | Target | Tone |
|---|---|---|---|
| `selam` | greeting | dunno | casual |
| `napıyon` | question:what_are_you_doing | dunno | casual |
| `neden böyle yaptın` | question:why | dunno | neutral |
| `nasıl yaptın` | question:how | dunno | curious |
| `bu ne` | question:what | dunno/context | curious |
| `noldu` | question:what_happened | dunno/context | casual |
| `iyi misin` | question:confirmation | dunno | caring |
| `malsın` | insult | dunno | teasing/aggressive |
| `mal mısın` | insult | dunno | teasing/aggressive |
| `çok tatlısın` | compliment | dunno | friendly |
| `seni seviyorum` | affection | dunno | friendly |
| `sağol` | thanks | dunno | casual |
| `özür dilerim` | apology | dunno | neutral |
| `yardım etsene` | help_request | dunno | casual |
| `çok yoruldum` | emotion_statement | user_self | tired |
| `ahahaha` | amusement | unknown | amused |
| `ne diyosun` | confusion | dunno | confused |
| `yok artık` | disbelief | situation | surprised |
| `bi sus` | command | dunno | annoyed |
| `gel buraya` | command | dunno | casual |
| `Excel niye böyle` | question:why | application | frustrated |
| `bu dosya niye açılmıyo` | question:why | application | frustrated |

---

# 53. IMPORTANT: KEYWORDS ARE SIGNALS, NOT ANSWERS

The system should use keywords to narrow down possibilities.

It must not blindly map:

```text
"ne" → what
"nasıl" → how
"aq" → insult
"mal" → insult
```

Instead:

```text
keyword
+
phrase
+
syntax
+
target
+
context
+
tone
```

must determine intent.

---

# 54. EXAMPLE DECISION

User:

> "olm sen napıyon aq"

Detection:

```text
normalized:
olm sen napıyon aq

question:
true

question_type:
what_are_you_doing

target:
dunno

tone:
casual

slang:
high

swearing:
true

swear_function:
familiarity

intent:
question:what_are_you_doing

confidence:
0.96
```

Response pool:

```text
question:what_are_you_doing
+
casual
+
slang>=2
```

Possible outputs:

```text
"takılıyorum işte"

"bi şey yaptığım yok"

"seni izliyom"

"ne yapıyım"

"burdayım işte"
```

---

# 55. EXAMPLE — INSULT

User:

> "malsın"

Detection:

```text
intent:
insult

target:
dunno

severity:
mild

tone:
playful/unknown
```

Response pool:

```text
insult:playful
```

Possible:

```text
"he sensin"

"sen de pek farklı değilsin"

"eyvallah"

"bunu senden duymak üzücü"

"tamam abi"
```

Do not automatically answer with aggression.

---

# 56. EXAMPLE — WHY QUESTION

User:

> "neden cevap vermiyon"

Detection:

```text
intent:
question:why

target:
dunno

tone:
annoyed

slang:
medium
```

Possible response:

```text
"gördüm de ne diyim"

"dur bi"

"burdayım işte"

"duymadım"
```

Do not use an unrelated joke.

---

# 57. EXAMPLE — HOW QUESTION

User:

> "bunu nasıl yapıcam"

Detection:

```text
intent:
question:how

help_request:
true

target:
dunno
```

If Dunno has the capability to answer:

→ provide useful information.

If Dunno does not have the required information:

```text
"onu bilmiyom"

"dur bi bakmak lazım"

"valla onu ben de bilmiyorum"
```

Never invent technical instructions.

---

# 58. EXAMPLE — "NE" AMBIGUITY

User:

> "bu ne"

→ question:what

User:

> "ne güzel olmuş"

→ compliment/reaction

User:

> "ne diyosun"

→ confusion

User:

> "ne zaman gelcen"

→ question:when

User:

> "ne kadar sürdü"

→ question:how_long

User:

> "ne biçim yaptın bunu"

→ teasing/disbelief

The system must distinguish these.

---

# 59. EXAMPLE — PROFANITY WITHOUT INSULT

User:

> "bu ne aq"

Detection:

```text
intent:
question:what / reaction

swearing:
true

swear_target:
situation

swear_function:
surprise
```

NOT:

```text
intent:
insult
```

---

# 60. EXAMPLE — INSULT WITH PROFANITY

User:

> "aq salak"

Detection:

```text
intent:
insult

target:
dunno

swearing:
true

severity:
mild/medium

tone:
aggressive_or_playful
```

Response pool:

```text
insult:playful
or
insult:strong
```

depending on context.

---

# 61. RESPONSE ENGINE PSEUDOCODE

```javascript
function handleUserMessage(rawMessage, context) {

    const normalized = normalize(rawMessage);

    const features = analyzeMessage(
        rawMessage,
        normalized,
        context
    );

    const intents = detectIntents(features);

    const primaryIntent = selectPrimaryIntent(intents);

    const responsePool = getResponsePool({
        intent: primaryIntent,
        questionType: features.questionType,
        tone: features.tone,
        target: features.target,
        context: context,
        slangLevel: features.slangLevel,
        swearLevel: features.swearLevel
    });

    const filtered = filterResponses(
        responsePool,
        features,
        recentResponses
    );

    const response = weightedSelect(filtered);

    recordResponse(response);

    return response.text;
}
```

---

# 62. INTENT DETECTOR PSEUDOCODE

```javascript
function detectIntents(features) {

    const scores = {};

    scoreGreeting(features, scores);
    scoreFarewell(features, scores);
    scoreQuestion(features, scores);
    scoreCommand(features, scores);
    scoreInsult(features, scores);
    scoreCompliment(features, scores);
    scoreAffection(features, scores);
    scoreThanks(features, scores);
    scoreApology(features, scores);
    scoreHelpRequest(features, scores);
    scoreEmotion(features, scores);
    scoreAmusement(features, scores);
    scoreConfusion(features, scores);
    scoreDisbelief(features, scores);
    scoreSmallTalk(features, scores);

    return sortByConfidence(scores);
}
```

---

# 63. QUESTION DETECTOR PSEUDOCODE

```javascript
function detectQuestion(features) {

    const text = features.normalized;
    const tokens = features.tokens;

    if (matches(text, [
        "napıyon",
        "napıyosun",
        "napıyorsun",
        "ne yapıyorsun",
        "ne yapıyon"
    ])) {
        return {
            isQuestion: true,
            type: "what_are_you_doing",
            confidence: 0.98
        };
    }

    if (matches(text, [
        "noldu",
        "ne oldu",
        "ne oldu şimdi"
    ])) {
        return {
            isQuestion: true,
            type: "what_happened",
            confidence: 0.97
        };
    }

    if (matchesWhyPattern(text)) {
        return {
            isQuestion: true,
            type: "why",
            confidence: 0.95
        };
    }

    if (matchesHowPattern(text)) {
        return {
            isQuestion: true,
            type: "how",
            confidence: 0.92
        };
    }

    if (matchesWherePattern(text)) {
        return {
            isQuestion: true,
            type: "where",
            confidence: 0.92
        };
    }

    if (matchesWhenPattern(text)) {
        return {
            isQuestion: true,
            type: "when",
            confidence: 0.92
        };
    }

    if (matchesWhatPattern(text)) {
        return {
            isQuestion: true,
            type: "what",
            confidence: 0.85
        };
    }

    if (hasQuestionSuffix(tokens)) {
        return {
            isQuestion: true,
            type: "unknown",
            confidence: 0.65
        };
    }

    return null;
}
```

---

# 64. DO NOT BUILD ONLY A GIANT KEYWORD LIST

Avoid creating a system like:

```javascript
if (text.includes("aq")) ...
if (text.includes("mal")) ...
if (text.includes("neden")) ...
if (text.includes("nasıl")) ...
```

A large keyword list alone will become fragile.

Use a layered system:

```text
Layer 1:
normalization

Layer 2:
exact phrase patterns

Layer 3:
token patterns

Layer 4:
question structure

Layer 5:
intent scoring

Layer 6:
context

Layer 7:
tone

Layer 8:
response selection
```

---

# 65. RESPONSE DATABASE DESIGN

The response database should contain **pre-written Dunno responses** rather than asking the runtime system to invent a completely new joke every time.

Example:

```json
{
  "intent": "question:what_are_you_doing",
  "responses": [
    {
      "text": "takılıyorum işte",
      "tone": "casual",
      "slang": 1
    },
    {
      "text": "bi şey yaptığım yok",
      "tone": "casual",
      "slang": 1
    },
    {
      "text": "seni izliyom",
      "tone": "casual",
      "slang": 2
    },
    {
      "text": "ne yapıyım",
      "tone": "casual",
      "slang": 1
    }
  ]
}
```

---

# 66. RESPONSE POOLS SHOULD BE LARGE

For common intents, aim for:

```text
greeting:
30–100 responses

question:what_are_you_doing:
30–100

question:why:
30–100

question:what:
30–100

insult:playful:
30–100

compliment:
30–100

thanks:
20–50

apology:
20–50

confusion:
30–80

disbelief:
30–80

amusement:
30–80

fallback:
50–100
```

Common intents need more variation.

---

# 67. APP-SPECIFIC INTENTS

Generic intent detection should happen BEFORE app-specific response selection.

Example:

User is in Excel:

```text
"malsın"
```

→ `insult:dunno`

NOT:

```text
app:excel
```

But:

```text
"bu tablo niye böyle"
```

→ `question:why`
+
`context=excel`

Then use:

```text
question:why
+
app:excel
```

if an Excel-specific response pool exists.

This creates:

```text
generic intent
+
specific context
```

rather than hundreds of unrelated triggers.

---

# 68. RESPONSE SELECTION HIERARCHY

Use:

```text
1. Exact intent + exact context
2. Intent + application
3. Intent + tone
4. Generic intent
5. Generic reaction
6. Fallback
```

Example:

```text
User:
"bu tablo niye böyle"

Context:
Excel

Try:
question:why + app:excel

If unavailable:
question:why

If unavailable:
generic question

If unavailable:
fallback
```

---

# 69. FINAL SYSTEM ARCHITECTURE

```text
                    USER MESSAGE
                         │
                         ▼
                 ┌──────────────┐
                 │ NORMALIZER   │
                 └──────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │ FEATURE       │
                │ EXTRACTOR     │
                └──────┬────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
      QUESTION       EMOTION      SLANG
      DETECTOR       DETECTOR     DETECTOR
          │            │            │
          └────────────┼────────────┘
                       ▼
                ┌───────────────┐
                │ INTENT        │
                │ SCORER        │
                └──────┬────────┘
                       ▼
                ┌───────────────┐
                │ TARGET +      │
                │ TONE          │
                └──────┬────────┘
                       ▼
                ┌───────────────┐
                │ CONTEXT       │
                │ MATCHER       │
                └──────┬────────┘
                       ▼
                ┌───────────────┐
                │ RESPONSE      │
                │ POOL          │
                └──────┬────────┘
                       ▼
                ┌───────────────┐
                │ FILTER        │
                │ + COOLDOWN    │
                └──────┬────────┘
                       ▼
                ┌───────────────┐
                │ WEIGHTED      │
                │ RANDOM        │
                └──────┬────────┘
                       ▼
                    DUNNO
```

---

# 70. GOLDEN RULE

The most important rule is:

> **Dunno should understand the user before deciding what to say.**

Do not make a random dialogue generator.

Build:

```text
UNDERSTANDING
→ INTENT
→ CONTEXT
→ RESPONSE POOL
→ NATURAL TURKISH RESPONSE
```

The system should make the user feel that Dunno actually understood:

> "ne dedin?"

> "neden?"

> "nasıl?"

> "napıyon?"

> "malsın"

> "çok tatlısın"

> "yardım etsene"

> "olm bu ne aq"

as **different types of interactions**, not as random strings containing different keywords.

The final goal:

> **Dunno does not merely generate Turkish. Dunno understands the shape of Turkish conversation.**