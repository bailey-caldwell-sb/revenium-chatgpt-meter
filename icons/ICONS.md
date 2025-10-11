# Extension Icons

This directory should contain the following icon files:

- `icon16.png` - 16x16 pixels (toolbar)
- `icon32.png` - 32x32 pixels (toolbar)
- `icon48.png` - 48x48 pixels (extensions page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## Generate Icons

You can generate placeholder icons using various methods:

### Method 1: Using ImageMagick (Command Line)

```bash
# Create a blue square with white "R" for Revenium
convert -size 128x128 xc:#00d4ff -fill white -pointsize 80 \
  -gravity center -annotate +0+0 'R' icons/icon128.png

# Resize for other sizes
convert icons/icon128.png -resize 48x48 icons/icon48.png
convert icons/icon128.png -resize 32x32 icons/icon32.png
convert icons/icon128.png -resize 16x16 icons/icon16.png
```

### Method 2: Using Python + PIL

```python
from PIL import Image, ImageDraw, ImageFont

# Create base image
img = Image.new('RGB', (128, 128), color='#00d4ff')
draw = ImageDraw.Draw(img)

# Add text
font = ImageFont.truetype('Arial', 80)
draw.text((64, 64), 'R', fill='white', font=font, anchor='mm')

# Save
img.save('icons/icon128.png')

# Resize for other sizes
for size in [48, 32, 16]:
    resized = img.resize((size, size), Image.LANCZOS)
    resized.save(f'icons/icon{size}.png')
```

### Method 3: Online Tools

1. Visit [favicon.io](https://favicon.io/favicon-generator/)
2. Create icon with:
   - Text: "R"
   - Background: #00d4ff (cyan)
   - Font color: white
3. Download and rename files

### Method 4: Design Software

Use Figma, Sketch, or Adobe Illustrator:
1. Create 128x128 artboard
2. Add cyan (#00d4ff) background
3. Add white "R" centered
4. Export at 128x, 48x, 32x, 16x

## Temporary Placeholder

If you need to test the extension immediately, you can use simple colored squares:

```bash
# Create simple colored placeholders (no text)
convert -size 128x128 xc:#00d4ff icons/icon128.png
convert -size 48x48 xc:#00d4ff icons/icon48.png
convert -size 32x32 xc:#00d4ff icons/icon32.png
convert -size 16x16 xc:#00d4ff icons/icon16.png
```

## Design Guidelines

- **Color Scheme**: Use Revenium brand colors
  - Primary: #00d4ff (cyan)
  - Accent: #00ff88 (green)
  - Background: #1a1a2e (dark blue)

- **Style**: Modern, minimal, tech-focused
- **Symbol**: "R" for Revenium or a meter/gauge icon
- **Format**: PNG with transparency (if needed)
