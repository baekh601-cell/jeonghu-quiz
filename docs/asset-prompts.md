# 🎨 정후의 세계일주 퀴즈왕 — 이미지 에셋 제작 가이드

## 컨셉
귀여운 9살 한국 남자아이 **정후**가 작은 비행기를 타고 세계를 여행하며 퀴즈를 풀어요. 주제마다 **여행지**가 하나씩 있고, 퀴즈를 통과하면 **여권에 도장**을 받아요. 도장을 모아 **퀴즈왕 왕관**을 얻는 게 목표예요.

## 올리는 곳
- 업로드 폴더: **https://github.com/baekh601-cell/jeonghu-quiz/tree/main/assets/raw**
- 방법: 위 링크 → **Add file → Upload files** → 파일을 끌어다 놓기 → **Commit changes**
- **파일 이름은 아래 표의 이름과 똑같이** 지어 주세요. 그래야 앱이 자동으로 인식해요.
- GPT가 만든 PNG를 **그대로** 올려 주세요. 앱에 맞는 크기로 줄이고 압축(WebP)하는 건 제가 할게요. 오프라인 앱이라 용량을 작게 유지해야 해요.
- ⚠️ 저장소는 공개로 전환될 예정이에요. **정후의 실제 사진은 올리지 마세요.** GPT에서 참고용으로만 쓰는 건 괜찮아요.

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

## 체크리스트
- [ ] 캐릭터 8개 (`jeonghu-*.png`)
- [ ] 아이콘 10개 (`icon-*.png`)
- [ ] 배경 2개 + 앱 아이콘 1개
- 총 **21개**. 한꺼번에 올리지 않아도 돼요. 올라온 파일부터 앱에 반영하고, 아직 없는 이미지는 임시 그림으로 표시할게요.
- 로고 글자("정후의 세계일주 퀴즈왕")는 GPT가 한글을 자주 틀리게 쓰기 때문에 이미지로 만들지 않고 앱에서 글꼴로 만들어요.
