# 건희 캐릭터 이미지 9장 만들기 (ChatGPT에 이 파일을 그대로 올려 주세요)

## 사용법 (사람이 읽는 부분)
1. ChatGPT 새 대화에 **이 파일**과 **`jeonghu-base.png`**(정후 기준 그림) 두 개를 함께 올려요.
2. 아래 "건희 생김새" 두 줄만 실제 건희에 맞게 고쳐요. (안 고쳐도 기본값으로 만들어져요)
3. 메시지로 **"시작"** 이라고 보내면 1번 이미지가 나와요. 마음에 들면 **"다음"**, 고치고 싶으면 고칠 점을 말해요.
4. 나온 이미지를 **표의 파일 이름 그대로** 저장해서 여기에 올려요:
   https://github.com/baekh601-cell/jeonghu-quiz/tree/main/assets/raw  (Add file → Upload files → Commit changes)

### ✏️ 건희 생김새 (여기만 고치면 돼요)
- 성별·나이: `8-year-old Korean boy`
- 머리 모양: `short tousled dark-brown hair`

---

## Instructions for ChatGPT (follow exactly)

You are generating a set of 9 consistent character images for a kids' mobile quiz game. The attached image `jeonghu-base.png` shows the existing main character and defines the art style. You will draw a second, clearly different child named Geonhee in the same style.

Rules:
- Generate ONE image per turn, in the order of the table below. Start with image 1 when the user says "시작".
- After each image, write one short Korean line: the file name to save it as, then "마음에 들면 '다음'이라고 해 주세요."
- When the user says "다음", generate the next image. If the user asks for a change, regenerate the same image with that change.
- Every image after image 1 must match image 1 (same face, hair, outfit, colors, proportions). Treat image 1 as the character reference.
- Every image must have a fully TRANSPARENT background (PNG with alpha). No text, letters, numbers or watermark anywhere.
- Use the image size listed for each row.
- After image 9, write in Korean: "9장 완성! 파일 이름 그대로 저장해서 GitHub assets/raw 폴더에 올려 주세요."

### STYLE (apply to every image)
Cute 2D vector sticker illustration for a kids' mobile quiz game. Thick rounded dark-navy outline (#1F2A5A), soft cel shading, clean flat colors. Palette: sky blue #4FB3FF, sunshine yellow #FFD43B, coral #FF6B6B, mint #3DDC97, cream #FFF8EC. Friendly, warm, high quality, consistent character design. Same art style, line weight and chibi proportions as the attached `jeonghu-base.png`. NO text, NO letters, NO watermark. Transparent background.

### CHARACTER "Geonhee" (apply to every image)
A cheerful child — use the "성별·나이" and "머리 모양" values from the section "건희 생김새" above (defaults: 8-year-old Korean boy, short tousled dark-brown hair). Chibi proportions (head about 1/3 of body), big sparkling dark-brown eyes, rosy cheeks, confident grin. An orange explorer bucket hat with a small white star badge. Mint-green zip hoodie over a white t-shirt, navy shorts, yellow sneakers, small orange cross-body bag. Must be clearly a different child from the one in `jeonghu-base.png` (who wears a sky-blue pilot jacket and aviator goggles).

### IMAGES

| # | Save as | Size | Scene |
|---|---|---|---|
| 1 | `geonhee-base.png` | 1024×1536 (portrait) | Full-body front view character reference, standing straight, relaxed happy expression, arms slightly away from body. Centered with generous padding. |
| 2 | `geonhee-wave.png` | 1024×1024 | Full body, waving hello with one hand raised high, big open-mouth smile, one foot slightly lifted, energetic. Centered. |
| 3 | `geonhee-think.png` | 1024×1024 | Upper body (waist up), thinking pose: arms crossed with one hand tapping the cheek, eyes looking up, a small question-mark-shaped sparkle near the head (a symbol, not a letter). Centered. |
| 4 | `geonhee-correct.png` | 1024×1024 | Full body, jumping in the air with one fist punching up in celebration, eyes closed happily, huge grin, small yellow stars and sparkles around. Centered. |
| 5 | `geonhee-wrong.png` | 1024×1024 | Full body, cute "oops" reaction: both hands on cheeks, surprised sheepish smile, one small sweat drop. NOT sad or crying — still positive. Centered. |
| 6 | `geonhee-king.png` | 1024×1024 | Full body, "Quiz King": wearing a shiny golden crown instead of the hat and a small blue royal cape over the hoodie, proudly holding a golden trophy up with both hands, confetti around. Centered. |
| 7 | `geonhee-explorer.png` | 1024×1024 | Full body, explorer pose: looking through binoculars held in one hand, holding a compass in the other, curious excited face. Centered. |
| 8 | `geonhee-walk.png` | 1024×1024 | Full body, walking cheerfully toward the viewer at a slight angle, one leg forward, arms swinging, cross-body bag visible. Must read clearly at very small size (64px): bold silhouette, simple shapes. Centered. |
| 9 | `geonhee-plane.png` | 1536×1024 (landscape) | Side view (facing right) of a small round cartoon propeller airplane, mint green with orange wings and a white stripe. Geonhee sits in the open cockpit, waving, hat strap fluttering behind. A few speed lines behind the plane. The plane fills most of the frame. |
