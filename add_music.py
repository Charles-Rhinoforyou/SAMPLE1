#!/usr/bin/env python3
"""
Génère une composition en sol mineur (style Ballade romantique),
la convertit en WAV via timidity, puis l'intègre dans La_ballade_vintage.pptx.
"""

import struct, subprocess, os, zipfile, shutil, io, base64, re, copy
from pathlib import Path

# ─── MIDI helpers ────────────────────────────────────────────────────────────

def vl(n):
    """Variable-length MIDI encoding"""
    if n == 0:
        return b'\x00'
    r = []
    while n:
        r.append(n & 0x7F)
        n >>= 7
    r.reverse()
    for i in range(len(r) - 1):
        r[i] |= 0x80
    return bytes(r)

def on(dt, ch, note, vel=72):
    return vl(dt) + bytes([0x90 | ch, note, vel])

def off(dt, ch, note):
    return vl(dt) + bytes([0x80 | ch, note, 0])

def meta_tempo(bpm):
    us = int(60_000_000 / bpm)
    return b'\x00\xff\x51\x03' + struct.pack('>I', us)[1:]

def meta_timesig(num, den_exp):
    """6/8 time: num=6, den_exp=3 (2^3=8)"""
    return b'\x00\xff\x58\x04' + bytes([num, den_exp, 24, 8])

def meta_end():
    return b'\x00\xff\x2f\x00'

def prog_change(ch, prog):
    return b'\x00' + bytes([0xC0 | ch, prog])

def mktrack(events_bytes):
    data = b''.join(events_bytes) + meta_end()
    return b'MTrk' + struct.pack('>I', len(data)) + data

def mkheader(n_tracks, tpb=480):
    return b'MThd\x00\x00\x00\x06' + struct.pack('>HHH', 1, n_tracks, tpb)


# ─── Note sequence → MIDI events ─────────────────────────────────────────────

def seq_events(notes, ch=0, base_vel=72, start=0):
    """
    notes: [(pitch_or_None, ticks)] or [(pitch, ticks, vel)]
    Returns list of (abs_tick, 'on'/'off', ch, note, vel), plus total ticks.
    """
    evs = []
    pos = start
    for item in notes:
        if len(item) == 3:
            p, dur, v = item
        else:
            p, dur = item
            v = base_vel
        if p is not None:
            hold = max(1, int(dur * 0.88))
            evs.append((pos,       'on',  ch, p, v))
            evs.append((pos + hold,'off', ch, p, 0))
        pos += dur
    return evs, pos


def to_delta_track(evs):
    """Convert absolute-tick events → delta-time MIDI bytes"""
    srt = sorted(evs, key=lambda e: (e[0], 0 if e[1] == 'off' else 1))
    result = []
    prev = 0
    for abs_t, etype, ch, note, vel in srt:
        dt = abs_t - prev
        prev = abs_t
        if etype == 'on':
            result.append(on(dt, ch, note, vel))
        else:
            result.append(off(dt, ch, note))
    return result


# ─── Composition ─────────────────────────────────────────────────────────────
# Sol mineur — style Ballade romantique (inspiré de Chopin)
# Tempo: 76 BPM, 6/8, TPB=480
# Ticks: E=240 (croche), DQ=720 (noire pointée = 1 temps de 6/8),
#         DH=1440 (noire doublement pointée = 1 mesure de 6/8)

TPB = 480
E   = 240     # croche
DQ  = 720     # noire pointée (1 temps de 6/8)
DH  = 1440    # mesure entière en 6/8
BPM = 76

# Notes en numéros MIDI
G2,Bb2,D3,Eb3,F3,G3,A3,Bb3=43,46,50,51,53,55,57,58
C4,D4,Eb4,F4,G4,A4,Bb4=60,62,63,65,67,69,70
C5,D5,Eb5,F5,G5,A5,Bb5=72,74,75,77,79,81,82

MELODY = [
    # ── INTRO ────────────────────────────────────────────
    # Levée: D5
    (D5, E, 60),

    # PHRASE 1 — Sol mineur, lyrique
    (G5, DQ, 72), (Eb5, DQ, 68),          # G5. Eb5.
    (D5, DQ, 70), (C5, DQ, 66),            # D5. C5.
    (Bb4, DQ, 68), (A4, DQ, 64),           # Bb4. A4.
    (G4, DH, 72),                           # G4 mesure pleine

    (D5, E, 65),
    (Eb5, DQ, 72), (F5, DQ, 70),           # Eb5. F5.
    (Eb5, DQ, 68), (D5, DQ, 65),           # Eb5. D5.
    (C5, DQ, 68), (Bb4, DQ, 65),           # C5. Bb4.
    (A4, DH, 70),                           # A4 mesure pleine

    # PHRASE 2 — Plus haute
    (Bb4, DQ, 68), (C5, DQ, 70),
    (D5, DQ, 72), (Eb5, DQ, 75),
    (F5, DQ, 78), (G5, DQ, 80),
    (A5, DH, 80),

    (G5, DQ, 78), (F5, DQ, 75),
    (Eb5, DQ, 72), (D5, DQ, 70),
    (C5, DQ, 68), (Bb4, DQ, 65),
    (A4, DH*2, 68),                         # A4 tenu 2 mesures

    # PHRASE 3 — Ré majeur / Fa majeur (tension dramatique)
    (G5, E, 70),
    (Bb5, DQ, 80), (A5, DQ, 78),
    (G5, DQ, 75), (F5, DQ, 72),
    (Eb5, DQ, 70), (D5, DQ, 68),
    (G4, DH, 72),                           # Résolution

    (D5, E, 65),
    (Eb5, DQ, 70), (D5, DQ, 68),
    (C5, DQ, 72), (Bb4, DQ, 70),
    (A4, DQ, 68), (G4, DQ, 65),
    (F4, DH, 62),

    # ── SECTION Mib MAJEUR ────────────────────────────────
    (Eb5, DQ, 75), (G5, DQ, 78),
    (Bb5, DQ, 80), (G5, DQ, 78),
    (Eb5, DQ, 75), (D5, DQ, 72),
    (C5, DH, 70),

    (Bb4, DQ, 70), (C5, DQ, 72),
    (D5, DQ, 75), (Eb5, DQ, 78),
    (F5, DQ, 80), (Eb5, DQ, 78),
    (D5, DH, 75),

    (C5, DQ, 72), (Bb4, DQ, 70),
    (A4, DQ, 68), (G4, DQ, 65),
    (F4, DQ, 62), (Eb4, DQ, 60),
    (D4, DH*2, 65),                         # Repos

    # ── RETOUR THÈME 1 ────────────────────────────────────
    (D5, E, 60),
    (G5, DQ, 72), (Eb5, DQ, 70),
    (D5, DQ, 70), (C5, DQ, 68),
    (Bb4, DQ, 68), (A4, DQ, 65),
    (G4, DH, 72),

    (D5, E, 65),
    (Eb5, DQ, 70), (F5, DQ, 72),
    (Eb5, DQ, 70), (D5, DQ, 68),
    (C5, DQ, 68), (Bb4, DQ, 65),
    (A4, DH, 68),

    # ── CODA — Descente finale ────────────────────────────
    (A4, DQ, 65), (G4, DQ, 62),
    (F4, DQ, 60), (Eb4, DQ, 58),
    (D4, DQ, 56), (C4, DQ, 54),
    (Bb3, DH, 52),

    (A3, DQ, 50), (G3, DQ, 50),
    (G3, DH*3, 48),                         # Sol grave final (très long)
]

# Basse / accompagnement arpégé (main gauche)
def arp(root, third, fifth, bars=1, vel_root=56, vel_inner=48):
    """Arpège de 6/8: basse-tier-quinte × 2 par mesure"""
    seq = []
    for _ in range(bars):
        for _ in range(2):
            seq.extend([
                (root,  E, vel_root),
                (third, E, vel_inner),
                (fifth, E, vel_inner),
            ])
    return seq

BASS = (
    arp(G2, Bb3, D4, 2) +
    arp(G2, Bb3, D4, 1) + arp(A3, C4, Eb4, 1) +      # G mineur → vii dim
    arp(Bb2, D3, F3, 1) + arp(A3, C4, F4, 1) +        # Sib → Fa
    arp(G2, Bb3, D4, 1) + arp(G2, Bb3, D4, 1) +
    arp(G2, Bb3, D4, 1) + arp(D3, F3, A3, 1) +
    arp(Bb2, D3, F3, 1) + arp(A3, C4, Eb4, 1) +
    arp(G2, Bb3, D4, 2) +
    arp(Bb2, D3, F3, 2) + arp(A3, C4, Eb4, 2) +
    arp(G2, Bb3, D4, 2) + arp(D3, F3, A3, 2) +
    arp(G2, Bb3, D4, 2) + arp(A3, C4, Eb4, 1) +
    arp(D3, F3, A3, 1) + arp(Bb2, D3, F3, 2) +
    arp(Eb3, G3, Bb3, 2) + arp(F3, A3, C4, 2) +
    arp(Eb3, G3, Bb3, 2) + arp(Bb2, D3, F3, 2) +
    arp(G2, Bb3, D4, 2) +
    arp(D3, F3, A3, 1) + arp(A3, C4, Eb4, 1) +
    arp(G2, Bb3, D4, 1) + arp(D3, F3, A3, 1) +
    arp(Bb2, D3, F3, 1) + arp(A3, C4, Eb4, 1) +
    arp(G2, Bb3, D4, 1) + arp(G2, Bb3, D4, 4)         # Fin
)


def build_midi():
    mel_evs, mel_ticks = seq_events(MELODY, ch=0, base_vel=72)
    bass_evs, bass_ticks = seq_events(BASS, ch=1, base_vel=52)

    print(f"  Durée mélodie : {mel_ticks/TPB/BPM*60:.1f} s")
    print(f"  Durée basse   : {bass_ticks/TPB/BPM*60:.1f} s")

    # Meta track
    meta_track = mktrack([meta_tempo(BPM), meta_timesig(6, 3)])

    # Melody track
    mel_bytes = to_delta_track(mel_evs)
    mel_track = mktrack([prog_change(0, 0)] + mel_bytes)

    # Bass track
    bass_bytes = to_delta_track(bass_evs)
    bass_track = mktrack([prog_change(1, 0)] + bass_bytes)

    return mkheader(3, TPB) + meta_track + mel_track + bass_track


# ─── Tiny PNG pour l'icône audio (1×1 px transparent) ────────────────────────

TINY_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAC"
    "hwGA60e6kgAAAABJRU5ErkJggg=="
)
TINY_PNG = base64.b64decode(TINY_PNG_B64)


# ─── Intégration dans le PPTX ────────────────────────────────────────────────

PPTX_SRC = '/home/user/SAMPLE1/La_ballade_vintage.pptx'
PPTX_DST = '/home/user/SAMPLE1/La_ballade_vintage.pptx'

RELS_NS  = 'http://schemas.openxmlformats.org/package/2006/relationships'
A_NS     = 'http://schemas.openxmlformats.org/drawingml/2006/main'
P_NS     = 'http://schemas.openxmlformats.org/presentationml/2006/main'
R_NS     = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'


def add_audio_to_pptx(wav_bytes):
    """Embeds WAV into PPTX and sets up background playback on slide 1."""

    # Load into memory
    buf = io.BytesIO()
    with open(PPTX_SRC, 'rb') as f:
        buf.write(f.read())
    buf.seek(0)

    out_buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'r') as zin, zipfile.ZipFile(out_buf, 'w', zipfile.ZIP_DEFLATED) as zout:

        for item in zin.namelist():
            data = zin.read(item)

            # ── Add audio icon image ──────────────────────────────────────
            if item == 'ppt/slides/_rels/slide1.xml.rels':
                # Append two new relationships
                old = data.decode('utf-8')
                insert = (
                    '<Relationship Id="rId3" '
                    'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/audio" '
                    'Target="../media/ballade_music.wav"/>'
                    '<Relationship Id="rId4" '
                    'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" '
                    'Target="../media/audio_icon.png"/>'
                )
                new = old.replace('</Relationships>', insert + '</Relationships>')
                data = new.encode('utf-8')

            elif item == 'ppt/slides/slide1.xml':
                xml = data.decode('utf-8')

                # ── Insert audio pic element before </p:spTree> ──────────
                audio_pic = '''<p:pic xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:nvPicPr>
    <p:cNvPr id="4" name="Background Music">
      <a:hlinkClick r:id="rId3" action="ppaction://media"/>
    </p:cNvPr>
    <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
    <p:nvPr><a:audioFile r:link="rId3"/></p:nvPr>
  </p:nvPicPr>
  <p:blipFill>
    <a:blip r:embed="rId4"/>
    <a:stretch><a:fillRect/></a:stretch>
  </p:blipFill>
  <p:spPr>
    <a:xfrm><a:off x="-914400" y="-914400"/><a:ext cx="457200" cy="457200"/></a:xfrm>
    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
  </p:spPr>
</p:pic>'''

                xml = xml.replace('</p:spTree>', audio_pic + '</p:spTree>')

                # ── Replace timing element ────────────────────────────────
                new_timing = '''<p:timing xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:tnLst>
    <p:par>
      <p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot">
        <p:childTnLst>
          <p:seq concurrent="1" nextAc="seek">
            <p:cTn id="2" dur="indefinite" nodeType="mainSeq">
              <p:childTnLst>
                <p:par>
                  <p:cTn id="3" fill="hold">
                    <p:stCondLst><p:cond delay="indefinite"/></p:stCondLst>
                    <p:childTnLst>
                      <p:par>
                        <p:cTn id="4" fill="hold">
                          <p:stCondLst><p:cond delay="0"/></p:stCondLst>
                          <p:childTnLst>
                            <p:audio>
                              <p:cMediaNode vol="80000" mute="0" numSld="0" showWhenStopped="0">
                                <p:cTn id="5" fill="hold">
                                  <p:stCondLst><p:cond delay="0"/></p:stCondLst>
                                </p:cTn>
                                <p:tgtEl><p:spTgt spid="4"/></p:tgtEl>
                              </p:cMediaNode>
                            </p:audio>
                          </p:childTnLst>
                        </p:par>
                      </p:par>
                    </p:childTnLst>
                  </p:par>
                </p:par>
              </p:childTnLst>
            </p:cTn>
            <p:prevCondLst>
              <p:cond evt="onPrev" delay="0"><p:tn/></p:cond>
            </p:prevCondLst>
          </p:seq>
        </p:childTnLst>
      </p:cTn>
    </p:par>
  </p:tnLst>
  <p:bldLst/>
</p:timing>'''

                old_timing = re.search(r'<p:timing>.*?</p:timing>', xml, re.DOTALL)
                if old_timing:
                    xml = xml[:old_timing.start()] + new_timing + xml[old_timing.end():]
                else:
                    xml = xml.replace('</p:sld>', new_timing + '</p:sld>')

                data = xml.encode('utf-8')

            elif item == '[Content_Types].xml':
                # Add WAV and PNG content types if missing
                xml = data.decode('utf-8')
                if 'audio/wav' not in xml:
                    xml = xml.replace(
                        '</Types>',
                        '<Default Extension="wav" ContentType="audio/wav"/></Types>'
                    )
                if '.png' not in xml.lower() or 'Extension="png"' not in xml:
                    xml = xml.replace(
                        '</Types>',
                        '<Default Extension="png" ContentType="image/png"/></Types>'
                    )
                data = xml.encode('utf-8')

            zout.writestr(item, data)

        # Add audio file
        zout.writestr('ppt/media/ballade_music.wav', wav_bytes)
        # Add tiny icon
        zout.writestr('ppt/media/audio_icon.png', TINY_PNG)

    out_buf.seek(0)
    with open(PPTX_DST, 'wb') as f:
        f.write(out_buf.read())
    print(f"  PPTX sauvegardé : {PPTX_DST}")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    midi_path = '/tmp/ballade_music.mid'
    wav_path  = '/tmp/ballade_music.wav'

    # 1. Générer le MIDI
    print("Génération du fichier MIDI (composition en sol mineur)…")
    midi_data = build_midi()
    with open(midi_path, 'wb') as f:
        f.write(midi_data)
    print(f"  MIDI écrit : {midi_path} ({len(midi_data)} octets)")

    # 2. Convertir en WAV avec timidity
    print("Conversion MIDI → WAV avec timidity (FluidR3_GM.sf2)…")
    sf2_candidates = [
        '/usr/share/sounds/sf2/FluidR3_GM.sf2',
        '/usr/share/sounds/sf2/default-GM.sf2',
    ]
    sf2 = next((p for p in sf2_candidates if os.path.exists(p)), None)

    cmd = ['timidity', midi_path, '-Ow', '-o', wav_path]
    if sf2:
        cmd += ['-x', f'soundfont {sf2}']

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 or not os.path.exists(wav_path):
        print("Timidity a échoué, passage à la synthèse Python…")
        # Fallback: pure Python sine-wave synthesis
        wav_bytes = python_synth_fallback()
        with open(wav_path, 'wb') as f:
            f.write(wav_bytes)
    else:
        print(f"  WAV généré : {wav_path} ({os.path.getsize(wav_path)/1024/1024:.1f} Mo)")

    # 3. Intégrer dans le PPTX
    print("Intégration de la musique dans le PPTX…")
    with open(wav_path, 'rb') as f:
        wav_bytes = f.read()
    add_audio_to_pptx(wav_bytes)

    print("\n✓ Terminé ! La musique de fond est maintenant intégrée.")
    print("  → Ouvrez avec PowerPoint et lancez le diaporama (F5).")
    print("  → La musique démarrera automatiquement et jouera sur toutes les diapositives.")


# ─── Synthèse Python de secours ──────────────────────────────────────────────

def python_synth_fallback():
    """Synthèse piano simplifiée si timidity échoue"""
    import math, wave, struct
    SR = 22050

    def freq(midi):
        return 440.0 * (2 ** ((midi - 69) / 12.0))

    def synth(midi_note, dur_s, vel=0.5):
        f = freq(midi_note)
        n = int(dur_s * SR)
        atk = int(0.015 * SR)
        rel = int(min(0.3, dur_s * 0.3) * SR)
        samples = []
        for i in range(n):
            t = i / SR
            if i < atk:
                env = i / atk
            elif i >= n - rel:
                env = (n - i) / rel * 0.7
            else:
                env = 0.7 + 0.3 * math.exp(-3.0 * (i - atk) / SR)
            v = (math.sin(2*math.pi*f*t) +
                 0.5*math.sin(2*math.pi*f*2*t)*math.exp(-1.5*t) +
                 0.25*math.sin(2*math.pi*f*3*t)*math.exp(-2.0*t) +
                 0.1*math.sin(2*math.pi*f*4*t)*math.exp(-3.0*t))
            samples.append(max(-1.0, min(1.0, v / 1.85 * vel * env)))
        return samples

    all_s = [0.0] * (SR * 120)  # 2 min silence
    pos = 0
    beat_s = 60.0 / BPM
    for item in MELODY:
        p, ticks = item[0], item[1]
        v = (item[2] / 100.0) if len(item) > 2 else 0.6
        dur_s = ticks / TPB * beat_s
        if p is not None:
            note_s = synth(p, dur_s * 0.88, v)
            for i, s in enumerate(note_s):
                idx = pos + i
                if idx < len(all_s):
                    all_s[idx] = max(-1.0, min(1.0, all_s[idx] + s))
        pos += int(dur_s * SR)

    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        packed = struct.pack(f'<{len(all_s)}h', *(int(s * 32767) for s in all_s))
        wf.writeframes(packed)
    buf.seek(0)
    return buf.read()


if __name__ == '__main__':
    main()
