#!/usr/bin/env python3
"""TikTok / Shorts / リール用の縦動画(1080x1920, 30fps)を、台本ファイル1つから組み立てる。

    python3 tools/video/cut.py tools/video/examples/d01-ja.cut            # → 台本と同じ名前の .mp4
    python3 tools/video/cut.py <台本.cut> -o ~/katsu-video/out/d01-ja.mp4
    python3 tools/video/cut.py <台本.cut> --preview                       # 字幕の位置を確かめる1枚(.png)も出す
    python3 tools/video/cut.py <台本.cut> --stills                        # 場面ごとの PNG も出す(写真モード用)

見た目は今のアプリに合わせる(spec §1 見た目の方向): 地は炭 #2B2A28、字は #F0EDE5、
太いゴシック(ヒラギノ角ゴ W8)。真っ黒・真っ白・明朝は使わない。

台本の書き方(1行に1つ。# から後ろはコメント。パスの ~ は展開する):

    clip  <動画> [from=秒] [to=秒] [speed=倍] [fill]
          元の動画の一部。縦横比が違えば炭の地に収める(fill を付けると切り取って全面に)
    image <画像> <秒>
          静止画をその秒数だけ出す(スクショ、きれいな1コマなど)
    card  <秒> <文>
          炭の全面に、文を真ん中に大きく出す(フックの1枚目、最後の CTA など)
    text  <開始秒> <終了秒> <top|middle|bottom> <文>
          組み上がった動画の上に字幕を重ねる。秒は動画の頭からの時刻
          (各場面が何秒から始まるかは、実行したときに表示される)
    voice <音声> [at=秒]
          自分の声などを重ねる。無ければ無音のトラックを入れる(無音で見る人が多い前提)

文の中の `\\n` は改行。書かなければ幅に合わせて自動で折り返す(句読点で行を始めない)。

⚠ TikTok は右側にボタン、下に説明文が重なる。字幕はその外に置く(下の SAFE)。
   位置を変えるときは --preview の1枚を TikTok の画面と見比べる。
⚠ 書いた言葉(KatsuMessage)を映すのは、本人が自分に書いた言葉だけ(docs/marketing/tiktok.md §0)。
"""

import argparse
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import unicodedata

W, H, FPS = 1080, 1920, 30
BG = '0x2B2A28'      # 炭
FG = '0xF0EDE5'      # 生成り
# Mac 以外(クラウドの Linux など)では KATSU_FONT で太いゴシックを指定する(例: Noto Sans JP Black)
FONT = os.environ.get('KATSU_FONT', '/System/Library/Fonts/ヒラギノ角ゴシック W8.ttc')

# 字幕を置ける範囲。上は状態バーとタブ、右はいいね等のボタン、下は名前と説明文を避ける
SAFE_LEFT, SAFE_RIGHT = 90, 150
SAFE_TOP, SAFE_BOTTOM = 260, 1400

STYLE = {
    # 文字の大きさ, 行の高さの倍率, 箱を付けるか
    'top': (66, 1.42, True),
    'middle': (66, 1.42, True),
    'bottom': (54, 1.42, True),
    'card': (80, 1.45, False),
}

ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', str(FPS)]

NO_LINE_START = set('、。,.!?」』)）〉》ー・:;…%')


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit('ffmpeg failed:\n' + ' '.join(shlex.quote(c) for c in cmd) + '\n' + r.stderr[-2000:])
    return r.stdout


def duration(path):
    return float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).strip())


def char_w(ch, size):
    """1文字の幅の見積もり。ヒラギノ角ゴ W8 の欧文はやや広い"""
    if unicodedata.east_asian_width(ch) in ('W', 'F', 'A'):
        return size
    if ch == ' ':
        return size * 0.3
    return size * 0.62


def text_w(s, size):
    return sum(char_w(c, size) for c in s)


def wrap(text, size, max_w):
    lines = []
    for para in text.split('\\n'):
        # 欧文は単語、和文は1文字ずつを単位にする
        tokens = re.findall(r'[A-Za-z0-9\'’“”"\-.,!?:;%/()&$+#@]+ ?|\s|.', para)
        line = ''
        for tok in tokens:
            if line and text_w((line + tok).rstrip(), size) > max_w:
                if tok.strip() and tok[0] in NO_LINE_START:
                    line += tok          # 句読点は前の行にぶら下げる
                    continue
                lines.append(line.rstrip())
                line = tok.lstrip()
            else:
                line += tok
        lines.append(line.rstrip())
    return [l for l in lines if l != ''] or ['']


class Timeline:
    def __init__(self, tmp):
        self.tmp = tmp
        self.segs = []      # (path, 長さ, 説明)
        self.texts = []     # (開始, 終了, 位置, 文)
        self.voices = []    # (path, at)
        self.n = 0
        self.stills = False

    def _out(self):
        self.n += 1
        return os.path.join(self.tmp, f'seg{self.n:03d}.mp4')

    def _fit(self, fill):
        if fill:
            return f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}'
        return (f'scale={W}:{H}:force_original_aspect_ratio=decrease,'
                f'pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color={BG}')

    def clip(self, src, start=0.0, end=None, speed=1.0, fill=False):
        dur = (end if end is not None else duration(src)) - start
        out = self._out()
        # ⚠ 尺は出力の -t ではなく trim で切る(-t は setpts より後に効き、早送りが打ち消される)
        vf = (f'trim=duration={dur},setpts=(PTS-STARTPTS)/{speed},fps={FPS},'
              f'{self._fit(fill)},setsar=1,format=yuv420p')
        run(['ffmpeg', '-y', '-v', 'error', '-ss', str(start), '-i', src, '-vf', vf, '-an', *ENC, out])
        self.segs.append((out, duration(out), f'clip {os.path.basename(src)} {start}-{start + dur:.1f}s ×{speed}'))

    def image(self, src, dur):
        out = self._out()
        run(['ffmpeg', '-y', '-v', 'error', '-loop', '1', '-i', src, '-t', str(dur),
             '-vf', f'{self._fit(False)},setsar=1,format=yuv420p', '-an', *ENC, out])
        self.segs.append((out, duration(out), f'image {os.path.basename(src)}'))

    def card(self, dur, text):
        out = self._out()
        filt = os.path.join(self.tmp, f'card{self.n:03d}.txt')
        with open(filt, 'w') as f:
            f.write(','.join(self._drawtext(text, 'card', None, None)) or 'null')
        run(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i', f'color=c={BG}:s={W}x{H}:r={FPS}:d={dur}',
             '-filter_script:v', filt, '-an', *ENC, out])
        self.segs.append((out, duration(out), f'card "{text[:24]}"'))

    def _drawtext(self, text, pos, t0, t1):
        size, lh_mul, box = STYLE[pos]
        lines = wrap(text, size, W - SAFE_LEFT - SAFE_RIGHT)
        lh = size * lh_mul
        block = lh * len(lines)
        if pos == 'top':
            y0 = SAFE_TOP
        elif pos == 'bottom':
            y0 = SAFE_BOTTOM - block
        else:
            y0 = (H - block) / 2
        # 右のボタンを避けた範囲の真ん中にそろえる
        cx = SAFE_LEFT + (W - SAFE_LEFT - SAFE_RIGHT) / 2
        out = []
        for i, line in enumerate(lines):
            self.n += 1
            tf = os.path.join(self.tmp, f't{self.n:04d}.txt')
            with open(tf, 'w') as f:
                f.write(line)
            y = y0 + i * lh + (lh - size) / 2
            opts = [f"fontfile='{FONT}'", f"textfile='{tf}'", 'expansion=none',
                    f'fontsize={size}', f'fontcolor={FG}', f'x={cx:.0f}-text_w/2', f'y={y:.0f}']
            if box:
                opts += ['box=1', f'boxcolor={BG}@0.90', f'boxborderw={int(size * 0.28)}']
            if t0 is not None:
                opts.append(f"enable='between(t,{t0},{t1})'")
            out.append('drawtext=' + ':'.join(opts))
        return out

    def render(self, dst, preview=False):
        if not self.segs:
            sys.exit('台本に clip / image / card が1つもありません')
        lst = os.path.join(self.tmp, 'list.txt')
        with open(lst, 'w') as f:
            f.writelines(f"file '{p}'\n" for p, _, _ in self.segs)
        joined = os.path.join(self.tmp, 'joined.mp4')
        run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', joined])
        total = duration(joined)

        print('場面(開始秒):')
        t = 0.0
        for _, d, desc in self.segs:
            print(f'  {t:6.2f}  {desc}  ({d:.2f}s)')
            t += d
        for a, b, pos, s in self.texts:
            if b > total + 0.05:
                print(f'  ⚠ 字幕が動画の長さ {total:.2f}s を越えています: {a}-{b} {s[:20]}')

        filters = []
        for a, b, pos, s in self.texts:
            filters += self._drawtext(s, pos, a, b)
        vfile = os.path.join(self.tmp, 'overlay.txt')
        with open(vfile, 'w') as f:
            f.write(','.join(filters) or 'null')

        cmd = ['ffmpeg', '-y', '-v', 'error', '-i', joined]
        if self.voices:
            for p, _ in self.voices:
                cmd += ['-i', p]
            mix = ';'.join(f'[{i + 1}:a]adelay={int(at * 1000)}:all=1[a{i}]' for i, (_, at) in enumerate(self.voices))
            mix += ';' + ''.join(f'[a{i}]' for i in range(len(self.voices)))
            mix += f'amix=inputs={len(self.voices)}:normalize=0,apad[aout]'
            afile = os.path.join(self.tmp, 'audio.txt')
            with open(afile, 'w') as f:
                f.write(mix)
            cmd += ['-filter_script:v', vfile, '-filter_complex_script', afile, '-map', '0:v', '-map', '[aout]']
        else:
            # 無音のトラックを入れておく(音の無い動画を嫌うアプリがあるため)
            cmd += ['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-filter_script:v', vfile,
                    '-map', '0:v', '-map', '1:a']
        cmd += [*ENC, '-c:a', 'aac', '-b:a', '160k', '-t', f'{total:.3f}', '-movflags', '+faststart', dst]
        run(cmd)
        print(f'→ {dst}  ({duration(dst):.2f}s, {W}x{H})')

        if self.stills:
            # 写真モード(スライド)用に、場面ごとに1枚ずつ書き出す。字幕が出ている場面は字幕ごと
            t = 0.0
            for i, (_, d, _) in enumerate(self.segs):
                png = re.sub(r'\.mp4$', '', dst) + f'.{i + 1}.png'
                run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{t + d / 2:.2f}', '-i', dst, '-frames:v', '1', png])
                print(f'  slide: {png}')
                t += d

        if preview:
            # 字幕が全部出ている瞬間を1枚ずつ。TikTok の画面と重ねて位置を確かめる用
            for i, (a, b, _, _) in enumerate(self.texts):
                png = re.sub(r'\.mp4$', '', dst) + f'.preview{i + 1}.png'
                run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{(a + b) / 2:.2f}', '-i', dst, '-frames:v', '1', png])
                print(f'  preview: {png}')


def parse(path, tl):
    base = os.path.dirname(os.path.abspath(path))

    def p(s):
        s = os.path.expanduser(s)
        return s if os.path.isabs(s) else os.path.join(base, s)

    for no, raw in enumerate(open(path, encoding='utf-8'), 1):
        line = raw.split(' #')[0].strip() if not raw.lstrip().startswith('#') else ''
        if not line:
            continue
        cmd, _, rest = line.partition(' ')
        try:
            if cmd == 'clip':
                parts = shlex.split(rest)
                kw = dict(x.split('=', 1) for x in parts[1:] if '=' in x)
                tl.clip(p(parts[0]), float(kw.get('from', 0)), float(kw['to']) if 'to' in kw else None,
                        float(kw.get('speed', 1)), 'fill' in parts[1:])
            elif cmd == 'image':
                src, dur = shlex.split(rest)
                tl.image(p(src), float(dur))
            elif cmd == 'card':
                dur, text = rest.split(' ', 1)
                tl.card(float(dur), text.strip().strip('"'))
            elif cmd == 'text':
                a, b, pos, text = rest.split(' ', 3)
                if pos not in ('top', 'middle', 'bottom'):
                    raise ValueError(f'位置は top / middle / bottom: {pos}')
                tl.texts.append((float(a), float(b), pos, text.strip().strip('"')))
            elif cmd == 'voice':
                parts = shlex.split(rest)
                kw = dict(x.split('=', 1) for x in parts[1:] if '=' in x)
                tl.voices.append((p(parts[0]), float(kw.get('at', 0))))
            else:
                raise ValueError(f'知らない命令: {cmd}')
        except (ValueError, KeyError, IndexError) as e:
            sys.exit(f'{path}:{no}: {e}\n  {raw.rstrip()}')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('script')
    ap.add_argument('-o', '--out')
    ap.add_argument('--preview', action='store_true')
    ap.add_argument('--stills', action='store_true', help='場面ごとの PNG も出す(写真モードのスライド用)')
    a = ap.parse_args()
    if not shutil.which('ffmpeg'):
        sys.exit('ffmpeg が見つかりません')
    if not os.path.exists(FONT):
        sys.exit(f'書体が見つかりません: {FONT}')
    dst = os.path.expanduser(a.out or re.sub(r'\.cut$', '', a.script) + '.mp4')
    os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='katsu-cut-') as tmp:
        tl = Timeline(tmp)
        tl.stills = a.stills
        parse(a.script, tl)
        tl.render(os.path.abspath(dst), a.preview)


if __name__ == '__main__':
    main()
