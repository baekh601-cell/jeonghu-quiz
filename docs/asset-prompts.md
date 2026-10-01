# 🎨 정후의 퀴즈 왕국 — 이미지 에셋 제작 가이드

## 컨셉
심술쟁이 **모르쇠 대왕**이 퀴즈 왕국의 지식 별을 훔쳐 갔어요. 귀여운 9살 한국 남자아이 **정후**가 8개 월드(수도 초원 → 깃발 해변 → 역사 고궁 마을 → 과학 화산섬 → 홈런 스타디움 → 넌센스 구름나라 → 탐험 정글 → 모르쇠 대왕의 성)를 지나며 스테이지를 깨고, 각 월드의 성에서 **보스**를 물리쳐 **퀴즈왕**이 되는 이야기예요.

## 올리는 곳
- 업로드 폴더: **https://github.com/baekh601-cell/jeonghu-quiz/tree/main/assets/raw**
- 방법: 위 링크 → **Add file → Upload files** → 파일을 끌어다 놓기 → **Commit changes**
- **파일 이름은 아래 표의 이름과 똑같이** 지어 주세요. 그래야 앱이 자동으로 인식해요.
- GPT가 만든 PNG를 **그대로** 올려 주세요. 앱에 맞는 크기로 줄이고 압축(WebP)하는 건 제가 할게요. 오프라인 앱이라 용량을 작게 유지해야 해요.
- ⚠️ 저장소는 공개 상태예요. **정후의 실제 사진은 올리지 마세요.** GPT에서 참고용으로만 쓰는 건 괜찮아요.

## 제작 순서 (중요)
1. **`jeonghu-base.png`를 가장 먼저** 만들어 마음에 들 때까지 다듬어 주세요.
2. 나머지 캐릭터 이미지는 **같은 대화에서, base 이미지를 첨부한 채로** 만들어 주세요. 그래야 얼굴과 옷이 똑같이 유지돼요.
3. 각 프롬프트 앞에 아래 **공통 스타일**을 붙여 넣어 주세요.

### 공통 스타일 (모든 프롬프트 앞에 붙이기)
```
Cute 2D vector sticker illustration for a kids' mobile quiz game. Thick rounded dark-navy outline (#1F2A5A), soft cel shading, clean flat colors. Palette: sky blue #4FB3FF, sunshine yellow #FFD43B, coral #FF6B6B, mint #3DDC97, cream #FFF8EC. Friendly, warm, high quality, consistent character design. NO text, NO letters, NO watermark.
```

### 정후 캐릭터 설정 (캐릭터 이미지에 함께 붙이기)
```
Character "Jeonghu": a cheerful 9-year-old Korean boy, chibi proportions (head about 1/3 of body), short black hair with soft rounded bangs, big sparkling dark-brown eyes, rosy cheeks, small smile. Brown aviator goggles resting on his head. Sky-blue pilot bomber jacket with a small yellow star patch, white t-shirt, khaki shorts, red sneakers, small yellow backpack.
```

---

## 1. 캐릭터 (투명 배경 PNG)

| 파일 이름 | GPT 생성 크기 | 앱에 표시되는 크기 | 쓰이는 곳 |
|---|---|---|---|
| `jeonghu-base.png` | 1024×1536 (세로) | 기준 이미지 | 캐릭터 기준 |
| `jeonghu-wave.png` | 1024×1024 | 약 200px | 홈 화면 인사 |
| `jeonghu-think.png` | 1024×1024 | 약 120px | 문제 풀 때 |
| `jeonghu-correct.png` | 1024×1024 | 약 160px | 정답 |
| `jeonghu-wrong.png` | 1024×1024 | 약 160px | 오답 |
| `jeonghu-king.png` | 1024×1024 | 약 240px | 결과·레벨업·퀴즈왕 |
| `jeonghu-explorer.png` | 1024×1024 | 약 140px | 지도 게임 |
| `jeonghu-plane.png` | 1536×1024 (가로) | 약 180px | 화면 전환 때 날아가는 비행기 |

**jeonghu-base.png**
```
[공통 스타일] [캐릭터 설정]
Full-body front view character reference, standing straight, relaxed happy expression, arms slightly away from body. Centered with generous padding. Transparent background.
```

**jeonghu-wave.png**
```
[공통 스타일] [캐릭터 설정] Same character as the attached reference image.
Full body, waving hello with one hand raised high, big open-mouth smile, one foot slightly lifted, energetic. Centered, transparent background.
```

**jeonghu-think.png**
```
[공통 스타일] [캐릭터 설정] Same character as the attached reference image.
Upper body (waist up), thinking pose: finger on chin, eyes looking up, small question-mark-shaped sparkle near head (a symbol, not a letter). Centered, transparent background.
```

**jeonghu-correct.png**
```
[공통 스타일] [캐릭터 설정] Same character as the attached reference image.
Full body, jumping in the air with both fists up in celebration, eyes closed happily, huge grin, small yellow stars and sparkles around him. Centered, transparent background.
```

**jeonghu-wrong.png**
```
[공통 스타일] [캐릭터 설정] Same character as the attached reference image.
Full body, cute "oops" reaction: scratching the back of his head, sheepish smile, one small sweat drop, NOT sad or crying — still positive. Centered, transparent background.
```

**jeonghu-king.png**
```
[공통 스타일] [캐릭터 설정] Same character as the attached reference image.
Full body, "Quiz King": wearing a shiny golden crown and a small red royal cape over his pilot jacket, proudly holding a golden trophy up with both hands, confetti around. Centered, transparent background.
```

**jeonghu-explorer.png**
```
[공통 스타일] [캐릭터 설정] Same character as the attached reference image.
Full body, explorer pose: holding a big magnifying glass up to one eye (eye looks big through the lens), a folded paper world map under the other arm, curious excited face. Centered, transparent background.
```

**jeonghu-plane.png**
```
[공통 스타일] [캐릭터 설정] Same character as the attached reference image.
Side view (facing right) of a small round cartoon propeller airplane, sky blue with yellow wings and a coral stripe. Jeonghu sits in the open cockpit, goggles on his eyes, waving, scarf fluttering behind. A few speed lines behind the plane. Plane fills most of the frame. Transparent background.
```

---

## 2. 주제별 여행지 아이콘 (투명 배경 PNG, 모두 1024×1024, 앱에서 약 72~96px)
작게 보여도 알아볼 수 있게, **하나의 큰 사물 + 두꺼운 외곽선의 동그란 스티커** 형태로 만들어요.

| 파일 이름 | 주제 | 프롬프트 (공통 스타일 뒤에 붙이기) |
|---|---|---|
| `icon-capital.png` | 나라와 수도 | `Round sticker icon: a cute stylized classical capitol building with a dome and a tiny waving flag on top. Centered, transparent background.` |
| `icon-flag.png` | 국기 | `Round sticker icon: three small colorful flags on poles crossed together (abstract color patterns, not real countries). Centered, transparent background.` |
| `icon-history.png` | 역사 | `Round sticker icon: an old rolled parchment scroll with a small Korean traditional roof tile (giwa) ornament and a feather quill. Centered, transparent background.` |
| `icon-science.png` | 과학 상식 | `Round sticker icon: a bubbling round-bottom flask with a tiny ringed planet floating above it. Centered, transparent background.` |
| `icon-kbo.png` | 프로야구 | `Round sticker icon: a baseball with red stitches crossed with a wooden bat, small motion sparkle. Centered, transparent background.` |
| `icon-nonsense.png` | 넌센스 | `Round sticker icon: a silly laughing lightbulb character with a twisted swirl of rainbow colors inside. Centered, transparent background.` |
| `icon-map.png` | 지도 게임 | `Round sticker icon: a folded treasure-style world map with a red location pin sticking out of it. Centered, transparent background.` |
| `icon-mix.png` | 전부 섞기 | `Round sticker icon: a cute globe wearing a tiny pilot hat, surrounded by small orbiting stars. Centered, transparent background.` |
| `icon-wrongnote.png` | 오답 노트 | `Round sticker icon: a small blue notebook with a pencil and a bookmark ribbon. Centered, transparent background.` |
| `icon-trophy.png` | 기록 | `Round sticker icon: a golden trophy cup with a star on it. Centered, transparent background.` |

---

## 3. 배경 · 앱 아이콘

| 파일 이름 | GPT 생성 크기 | 쓰이는 곳 |
|---|---|---|
| `bg-sky.png` | 1024×1536 (세로) | 홈과 퀴즈 화면 배경 |
| `bg-passport.png` | 1536×1024 (가로) | 결과 화면의 여권 페이지 |
| `app-icon.png` | 1024×1024 | 휴대폰 홈 화면 아이콘 |

**bg-sky.png**
```
[공통 스타일]
Vertical mobile game background: bright friendly sky gradient from light blue at top to cream at bottom, soft fluffy clouds, tiny distant famous landmarks silhouettes along the bottom edge (Eiffel Tower, Namsan Tower, pyramids, Statue of Liberty, Big Ben) in pale pastel. Keep the center area calm and empty for UI. No characters. Not transparent.
```

**bg-passport.png**
```
[공통 스타일]
An open passport booklet seen from above, two cream pages with subtle guilloche security pattern and faint world-map watermark, empty space for stamps, navy cover edges visible around. Flat, no text. Not transparent.
```

**app-icon.png**
```
[공통 스타일] [캐릭터 설정] Same character as the attached reference image.
App icon: close-up of Jeonghu's smiling face looking out of a round airplane window, goggles on his head, blue sky and clouds outside. Fill the entire square edge to edge, no rounded corners, no transparency.
```

---

## 4. 왕국 모드 추가 이미지 (투명 배경 PNG)

### 정후 · 상점 주인
| 파일 이름 | GPT 생성 크기 | 앱 표시 크기 | 쓰이는 곳 |
|---|---|---|---|
| `jeonghu-walk.png` | 1024×1024 | 약 64px | 월드맵 위를 걸어 다니는 정후 |
| `shopkeeper.png` | 1024×1024 | 약 72px | 상점 주인 (부엉이 할아버지) |

**jeonghu-walk.png**
```
[공통 스타일] [캐릭터 설정] Same character as the attached reference image.
Full body, walking cheerfully toward the viewer at a slight angle, one leg forward, arms swinging, backpack visible. Must read clearly at very small size (64px): bold silhouette, simple shapes. Centered, transparent background.
```

**shopkeeper.png**
```
[공통 스타일]
A kind old owl shopkeeper with small round glasses, a striped apron and a tiny merchant cap, holding a small pouch of gold coins, friendly welcoming smile. Upper body. Centered, transparent background.
```

### 월드 보스 8종 (모두 1024×1024, 앱에서 약 90~150px)
무섭지 않고 **장난스럽고 귀여운 악당**이어야 해요. 9살 아이가 "물리치고 싶다"고 느낄 정도로만. 모두 **정면을 보고 서 있는 전신**으로 만들어 주세요.

| 파일 이름 | 월드 | 보스 | 프롬프트 (공통 스타일 뒤에 붙이기) |
|---|---|---|---|
| `boss-1.png` | 1 수도 초원 | 멧돼지 대장 붕붕 | `Boss character: a chubby cartoon wild boar general with tiny tusks, a dented soldier helmet with a flower stuck in it, arms crossed, grumpy but silly expression. Full body, centered, transparent background.` |
| `boss-2.png` | 2 깃발 해변 | 꽃게 선장 집게리 | `Boss character: a big red crab pirate captain with an eyepatch and a tricorn hat, one claw holding a tangled bundle of colorful flags, mischievous grin. Full body, centered, transparent background.` |
| `boss-3.png` | 3 역사 고궁 마을 | 심술 이무기 | `Boss character: a cute but sulky Korean imugi (serpent-dragon without full horns) coiled up, jade-green scales, holding an old scroll in its mouth, pouting cheeks. Full body, centered, transparent background.` |
| `boss-4.png` | 4 과학 화산섬 | 용암 공룡 뜨거라 | `Boss character: a round orange baby T-rex made of cooling lava rock with glowing cracks, wearing oversized safety goggles, tiny arms raised, puffing a small steam cloud. Full body, centered, transparent background.` |
| `boss-5.png` | 5 홈런 스타디움 | 홈런 고릴라 빵빵 | `Boss character: a big friendly-looking gorilla baseball slugger with a backwards cap and a giant wooden bat on his shoulder, chewing bubble gum blowing a pink bubble, cocky smirk. Full body, centered, transparent background.` |
| `boss-6.png` | 6 넌센스 구름나라 | 장난꾸러기 문어 꼬물 | `Boss character: a pastel purple octopus jester with a floppy jester hat, each tentacle juggling a different silly object (rubber duck, pie, balloon), laughing with tongue out. Full body, centered, transparent background.` |
| `boss-7.png` | 7 탐험 정글 | 정글 대왕뱀 스르륵 | `Boss character: a long green jungle snake wearing an explorer pith helmet and a monocle, coiled around a treasure map, smug sneaky smile. Full body, centered, transparent background.` |
| `boss-8.png` | 8 모르쇠 대왕의 성 | 모르쇠 대왕 | `Final boss character: King "Moreusoe", a short round purple goblin-like king with a too-big crooked crown, a long royal cape, holding a sack overflowing with glowing golden stars he stole, covering his ears with one hand ("I don't know anything!"), bratty smug face. Full body, centered, transparent background.` |

### 자유 여행 아이콘
| 파일 이름 | 크기 | 프롬프트 (공통 스타일 뒤에 붙이기) |
|---|---|---|
| `icon-speed.png` | 1024×1024 | `Round sticker icon: a yellow stopwatch with a lightning bolt, motion lines. Centered, transparent background.` |
## 5. 두 번째 캐릭터 "건희" (2인용 대전용, 투명 배경 PNG)

정후와 **같은 그림체**인데 한눈에 구별되는 친구 캐릭터예요. 정후는 하늘색 점퍼 + 고글, 건희는 **민트색 후드 + 주황 탐험 모자**로 색을 나눴어요.

### 만드는 순서
1. 같은 GPT 대화에서 **`jeonghu-base.png` 를 첨부**하고 "같은 그림체로 다른 아이를 그려 줘"라고 시작하면 그림체가 맞아요.
2. `geonhee-base.png` 를 먼저 만들어 마음에 들 때까지 다듬고, 나머지 8개는 **`geonhee-base.png` 를 첨부한 채로** 만들어 주세요.
3. 모든 프롬프트 앞에 맨 위의 **공통 스타일** + 아래 **건희 캐릭터 설정**을 붙여 주세요.

### 건희 캐릭터 설정 (✏️ 대괄호 부분은 실제 건희에 맞게 바꿔 주세요)
```
Character "Geonhee": a cheerful [8-year-old Korean boy / girl], chibi proportions (head about 1/3 of body), [short tousled dark-brown hair / hair style of your choice], big sparkling dark-brown eyes, rosy cheeks, confident grin. An orange explorer bucket hat with a small white star badge. Mint-green zip hoodie over a white t-shirt, navy shorts, yellow sneakers, small orange cross-body bag. Same art style, line weight and proportions as the attached reference character, but clearly a different child.
```

| 파일 이름 | GPT 생성 크기 | 쓰이는 곳 |
|---|---|---|
| `geonhee-base.png` | 1024×1536 (세로) | 캐릭터 기준 |
| `geonhee-wave.png` | 1024×1024 | 타이틀·캐릭터 선택·VS 화면 |
| `geonhee-think.png` | 1024×1024 | 문제 풀 때 |
| `geonhee-correct.png` | 1024×1024 | 정답 |
| `geonhee-wrong.png` | 1024×1024 | 오답 |
| `geonhee-king.png` | 1024×1024 | 승리·보스 격파 |
| `geonhee-explorer.png` | 1024×1024 | 지도 게임 |
| `geonhee-walk.png` | 1024×1024 | 월드맵에서 걷기 |
| `geonhee-plane.png` | 1536×1024 (가로) | 화면 전환 때 날아가는 탈것 |

**geonhee-base.png**
```
[공통 스타일] [건희 캐릭터 설정]
Full-body front view character reference, standing straight, relaxed happy expression, arms slightly away from body. Centered with generous padding. Transparent background.
```
**geonhee-wave.png**
```
[공통 스타일] [건희 캐릭터 설정] Same character as the attached reference image.
Full body, waving hello with one hand raised high, big open-mouth smile, one foot slightly lifted, energetic. Centered, transparent background.
```
**geonhee-think.png**
```
[공통 스타일] [건희 캐릭터 설정] Same character as the attached reference image.
Upper body (waist up), thinking pose: arms crossed with one hand tapping the cheek, eyes looking up, small question-mark-shaped sparkle near head (a symbol, not a letter). Centered, transparent background.
```
**geonhee-correct.png**
```
[공통 스타일] [건희 캐릭터 설정] Same character as the attached reference image.
Full body, jumping in the air with one fist punching up in celebration, eyes closed happily, huge grin, small yellow stars and sparkles around. Centered, transparent background.
```
**geonhee-wrong.png**
```
[공통 스타일] [건희 캐릭터 설정] Same character as the attached reference image.
Full body, cute "oops" reaction: both hands on cheeks, surprised sheepish smile, one small sweat drop, NOT sad or crying — still positive. Centered, transparent background.
```
**geonhee-king.png**
```
[공통 스타일] [건희 캐릭터 설정] Same character as the attached reference image.
Full body, "Quiz King": wearing a shiny golden crown (over or instead of the hat) and a small blue royal cape over the hoodie, proudly holding a golden trophy up with both hands, confetti around. Centered, transparent background.
```
**geonhee-explorer.png**
```
[공통 스타일] [건희 캐릭터 설정] Same character as the attached reference image.
Full body, explorer pose: looking through binoculars with one hand, holding a compass in the other, curious excited face. Centered, transparent background.
```
**geonhee-walk.png**
```
[공통 스타일] [건희 캐릭터 설정] Same character as the attached reference image.
Full body, walking cheerfully toward the viewer at a slight angle, one leg forward, arms swinging, cross-body bag visible. Must read clearly at very small size (64px): bold silhouette, simple shapes. Centered, transparent background.
```
**geonhee-plane.png**
```
[공통 스타일] [건희 캐릭터 설정] Same character as the attached reference image.
Side view (facing right) of a small round cartoon propeller airplane, mint green with orange wings and a white stripe. Geonhee sits in the open cockpit, waving, hat strap fluttering behind. A few speed lines behind the plane. Plane fills most of the frame. Transparent background.
```
## 체크리스트
- [ ] 캐릭터 8개 (`jeonghu-*.png`)
- [ ] 아이콘 10개 (`icon-*.png`)
- [ ] 배경 2개 + 앱 아이콘 1개
- [ ] 왕국 모드: 걷는 정후, 상점 주인, 보스 8종, 스피드 아이콘 (11개)
- [ ] 건희 캐릭터 9개 (`geonhee-*.png`)
- 총 **32개**. 우선순위: `jeonghu-base` → 표정 5종 → `jeonghu-walk` → 보스 8종 → 나머지. 한꺼번에 올리지 않아도 돼요. 올라온 파일부터 앱에 반영하고, 아직 없는 이미지는 임시 그림으로 표시할게요.
- 로고 글자("정후의 세계일주 퀴즈왕")는 GPT가 한글을 자주 틀리게 쓰기 때문에 이미지로 만들지 않고 앱에서 글꼴로 만들어요.
