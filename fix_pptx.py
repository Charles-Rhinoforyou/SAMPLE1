#!/usr/bin/env python3
"""
Corrige le La_ballade_vintage.pptx :
  1. Timing XML malformé (</p:cTn> remplacés par </p:par>) → corrigé
  2. Redéclarations de namespace inutiles sur <p:pic> et <p:timing> → supprimées
  3. Valeurs "indefinite" → "indefin" (conformité OOXML)
"""

import zipfile, io, re

SRC = '/home/user/SAMPLE1/La_ballade_vintage.pptx'

# ─── Timing XML CORRIGÉ ───────────────────────────────────────────────────────
# (sans redéclaration xmlns, sans "indefinite")
CORRECT_TIMING = '''\
<p:timing>
  <p:tnLst>
    <p:par>
      <p:cTn id="1" dur="indefin" restart="never" nodeType="tmRoot">
        <p:childTnLst>
          <p:seq concurrent="1" nextAc="seek">
            <p:cTn id="2" dur="indefin" nodeType="mainSeq">
              <p:childTnLst>
                <p:par>
                  <p:cTn id="3" fill="hold">
                    <p:stCondLst><p:cond delay="indefin"/></p:stCondLst>
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
                        </p:cTn>
                      </p:par>
                    </p:childTnLst>
                  </p:cTn>
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

# ─── Audio pic CORRIGÉ ───────────────────────────────────────────────────────
# (sans redéclaration xmlns — les namespaces viennent de <p:sld>)
CORRECT_AUDIO_PIC = '''\
<p:pic>
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


def fix_slide1(xml: str) -> str:
    # 1. Supprimer l'ancien audio pic (avec namespace) et l'ancien timing
    xml = re.sub(
        r'<p:pic\s+xmlns:p="[^"]*"[^>]*>.*?</p:pic>',
        '', xml, flags=re.DOTALL
    )
    xml = re.sub(
        r'<p:timing[\s\S]*?</p:timing>',
        '', xml, flags=re.DOTALL
    )

    # 2. Insérer le bon audio pic avant </p:spTree>
    xml = xml.replace('</p:spTree>', CORRECT_AUDIO_PIC + '\n</p:spTree>')

    # 3. Insérer le bon timing avant </p:sld>
    xml = xml.replace('</p:sld>', CORRECT_TIMING + '\n</p:sld>')

    return xml


def main():
    buf = io.BytesIO()
    with open(SRC, 'rb') as f:
        buf.write(f.read())
    buf.seek(0)

    out = io.BytesIO()
    with zipfile.ZipFile(buf, 'r') as zin, \
         zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zout:

        for item in zin.namelist():
            data = zin.read(item)

            if item == 'ppt/slides/slide1.xml':
                xml = data.decode('utf-8')
                xml = fix_slide1(xml)
                data = xml.encode('utf-8')

                # Validate with lxml
                from lxml import etree
                try:
                    etree.fromstring(data)
                    print("  slide1.xml : XML valide ✓")
                except etree.XMLSyntaxError as e:
                    print(f"  slide1.xml ERREUR XML : {e}")

            zout.writestr(item, data)

    out.seek(0)
    with open(SRC, 'wb') as f:
        f.write(out.read())
    print(f"Fichier corrigé : {SRC}")


if __name__ == '__main__':
    main()
