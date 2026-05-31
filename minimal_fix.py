#!/usr/bin/env python3
"""
Minimal fix: restore from before_fix.pptx (which opens in PowerPoint)
and fix ONLY the two malformed </p:par> closing tags inside <p:timing>.
Keeps all xmlns declarations exactly as-is.
"""

import zipfile, io

SRC = '/tmp/before_fix.pptx'
DST = '/home/user/SAMPLE1/La_ballade_vintage.pptx'


def fix_timing(xml: str) -> str:
    # Fix </p:par> that should close <p:cTn id="4"> (24-space indent)
    xml = xml.replace(
        '                        </p:par>\n                      </p:par>',
        '                        </p:cTn>\n                      </p:par>',
        1
    )
    # Fix </p:par> that should close <p:cTn id="3"> (18-space indent)
    xml = xml.replace(
        '                  </p:par>\n                </p:par>',
        '                  </p:cTn>\n                </p:par>',
        1
    )
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
                xml_fixed = fix_timing(xml)

                if xml_fixed == xml:
                    print("WARNING: No replacements made — pattern not found!")
                else:
                    # Count changes
                    changed = sum(1 for a, b in zip(xml.split('\n'), xml_fixed.split('\n')) if a != b)
                    print(f"Fixed {changed} lines in slide1.xml")

                # Validate with lxml
                from lxml import etree
                try:
                    etree.fromstring(xml_fixed.encode('utf-8'))
                    print("slide1.xml: XML valid ✓")
                except etree.XMLSyntaxError as e:
                    print(f"slide1.xml XML ERROR: {e}")
                    return

                data = xml_fixed.encode('utf-8')

            zout.writestr(item, data)

    out.seek(0)
    with open(DST, 'wb') as f:
        f.write(out.read())
    print(f"Written: {DST}")


if __name__ == '__main__':
    main()
