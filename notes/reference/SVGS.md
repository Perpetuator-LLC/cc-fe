# Landing Page Art

## 4

Lines not fixed and wiggle

```html
<svg viewBox="0 0 1440 320" preserveAspectRatio="none">
  <g>
    <path stroke="url(#gradient)" fill="none" stroke-width="2">
      <animate attributeName="d" dur="5s" repeatCount="indefinite"
               values="M0,160 C200,0 600,320 1000,160 C1300,0 1440,160 1440,320;
                M0,160 C200,320 600,0 1000,160 C1300,320 1440,160 1440,0;
                M0,160 C200,0 600,320 1000,160 C1300,0 1440,160 1440,320" />
    </path>
    <path stroke="url(#gradient)" fill="none" stroke-width="2">
      <animate attributeName="d" dur="7s" repeatCount="indefinite"
               values="M0,180 C250,20 750,340 1200,180 C1400,40 1440,180 1440,320;
                M0,180 C250,340 750,20 1200,180 C1400,300 1440,180 1440,0;
                M0,180 C250,20 750,340 1200,180 C1400,40 1440,180 1440,320" />
    </path>
    <path stroke="url(#gradient)" fill="none" stroke-width="2">
      <animate attributeName="d" dur="9s" repeatCount="indefinite"
               values="M0,200 C300,40 900,360 1300,200 C1440,100 1440,200 1440,320;
                M0,200 C300,360 900,40 1300,200 C1440,260 1440,200 1440,0;
                M0,200 C300,40 900,360 1300,200 C1440,100 1440,200 1440,320" />
    </path>
  </g>
  <defs>
    <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4facfe" />
      <stop offset="100%" stop-color="#00f2fe" />
    </linearGradient>
  </defs>
</svg>
```

## 3

Lines fixed and wiggle

```html
<div class="animated-background">
  <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
    <g>
      <path stroke="url(#gradient)" fill="none" stroke-width="2">
        <animate attributeName="d" dur="5s" repeatCount="indefinite"
                 values="M0,160 C180,0 360,320 540,160 S1080,160 1440,160;
                M0,160 C180,320 360,0 540,160 S1080,160 1440,160;
                M0,160 C180,0 360,320 540,160 S1080,160 1440,160" />
      </path>
      <path stroke="url(#gradient)" fill="none" stroke-width="2">
        <animate attributeName="d" dur="7s" repeatCount="indefinite"
                 values="M0,180 C180,20 360,340 540,180 S1080,180 1440,180;
                M0,180 C180,340 360,20 540,180 S1080,180 1440,180;
                M0,180 C180,20 360,340 540,180 S1080,180 1440,180" />
      </path>
      <path stroke="url(#gradient)" fill="none" stroke-width="2">
        <animate attributeName="d" dur="9s" repeatCount="indefinite"
                 values="M0,200 C180,40 360,360 540,200 S1080,200 1440,200;
                M0,200 C180,360 360,40 540,200 S1080,200 1440,200;
                M0,200 C180,40 360,360 540,200 S1080,200 1440,200" />
      </path>
    </g>
    <defs>
      <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#4facfe" />
        <stop offset="100%" stop-color="#00f2fe" />
      </linearGradient>
    </defs>
  </svg>
</div>
```

## 2

Lines wiggling

```html
<div class="animated-background">
  <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
    <g>
      <path stroke="url(#gradient)" fill="none" stroke-width="2">
        <animate attributeName="d" dur="5s" repeatCount="indefinite" values="M0,160 Q360,40 720,160 T1440,160; M0,160 Q360,80 720,160 T1440,160; M0,160 Q360,40 720,160 T1440,160" />
      </path>
      <path stroke="url(#gradient)" fill="none" stroke-width="2">
        <animate attributeName="d" dur="7s" repeatCount="indefinite" values="M0,180 Q360,60 720,180 T1440,180; M0,180 Q360,100 720,180 T1440,180; M0,180 Q360,60 720,180 T1440,180" />
      </path>
      <path stroke="url(#gradient)" fill="none" stroke-width="2">
        <animate attributeName="d" dur="9s" repeatCount="indefinite" values="M0,200 Q360,80 720,200 T1440,200; M0,200 Q360,120 720,200 T1440,200; M0,200 Q360,80 720,200 T1440,200" />
      </path>
    </g>
    <defs>
      <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#4facfe" />
        <stop offset="100%" stop-color="#00f2fe" />
      </linearGradient>
    </defs>
  </svg>
</div>
```

## 1

Lines barely wiggling

```html
<div class="animated-background">
  <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
    <path fill="url(#gradient)" fill-opacity="0.7">
      <animate attributeName="d" dur="500ms" repeatCount="indefinite" values="M0,320L48,288C96,256,192,192,288,165.3C384,139,480,149,576,181.3C672,213,768,267,864,272C960,277,1056,235,1152,218.7C1248,203,1344,213,1392,218.7L1440,224L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z;M0,320L60,290C120,260,240,200,360,170C480,140,600,150,720,180C840,210,960,260,1080,275C1200,290,1320,260,1380,240L1440,220L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z;M0,320L48,288C96,256,192,192,288,165.3C384,139,480,149,576,181.3C672,213,768,267,864,272C960,277,1056,235,1152,218.7C1248,203,1344,213,1392,218.7L1440,224L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z" />
    </path>
    <defs>
      <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#4facfe" />
        <stop offset="100%" stop-color="#00f2fe" />
      </linearGradient>
    </defs>
  </svg>
</div>
```
