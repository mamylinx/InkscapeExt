import inkex
from inkex.elements._text import FlowRoot, TextElement, Tspan
from lxml import etree
import os
import platform
import re
import subprocess
import sys


DEFAULT_FONT_HEIGHT = 720
EXTENSION_DIR = '.'
os_type = platform.system()

'''
Arguments: text, font, min font size, max font size, kerning in em, arc height
Returns data d path of curved text
'''
def curvedText(text, font, minS, maxS, letterSpacing, arc_height, doc_width):
    minS = str(minS)
    maxS = str(maxS)
    letterSpacing = str(letterSpacing)
    arc_height = str(arc_height)
    if os_type == "Darwin":
        node_cmd = 'node/bin/hx_node_darwin'
    elif os_type == "Linux":
        node_cmd = 'node/bin/hx_node_linux'
    else:
        node_cmd = 'node/bin/hx_node_windows'

    result = subprocess.run([node_cmd, EXTENSION_DIR + '/js/src/curve.js', text, font, minS, maxS, letterSpacing, arc_height, str(0), str(0), str(doc_width) ], stdout=subprocess.PIPE)
    outpath = result.stdout.rstrip()

    #return {"data": outpath.decode("utf-8")}
    return {"data": outpath}

'''
Arguments: font name
Returns otf/ttf file of font_name
Depends on OS type
'''
def get_font_file(font_name):
    _win_font_dir = os.path.normpath("C:/windows/fonts/")
    if os_type == "Windows":
        _cmd = 'reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts" /s'
    elif os_type == "Darwin":
        _cmd = '/usr/local/bin/fc-list'
    else:
        _cmd = 'fc-list'

    result = {}
    get_list_cmd = subprocess.Popen(_cmd, stdout=subprocess.PIPE)
    output, err = get_list_cmd.communicate()

    if err is None:
        for i in output.splitlines():
            detail = re.split(':|,', str(i.decode("utf8")))
            if os_type == "Windows":
                result[detail[0].strip()] = _win_font_dir + detail[1].strip()
            else:
                result[detail[1].strip()] = detail[0].strip()
    else:
        #inkex.errormsg(str(err))
        #sys.exit(1)
        inkex.AbortExtension(str(err))

    return result.get(font_name.replace("'","")) # Remove quotes around font name with space

class HashCurve(inkex.EffectExtension):
    def effect(self):
        """Performs the effect."""
        txt_node = self.svg.selection.get(TextElement, FlowRoot).values()

        for elem in txt_node:
            ff = elem.style.get("font-family")
            txt = elem.get_text()
            _id = elem.get_id()
            self.svg.getElementById(_id).delete()

        font_path = get_font_file(ff)
        min_font_size = 200
        max_font_size = 1200
        kerning = 0.1
        arch = 600
        x = 0
        y = 0
        doc_width = inkex.units.convert_unit(self.svg.width, 'px')
        
        data = curvedText(txt, font_path, min_font_size, max_font_size, kerning, arch, doc_width)
        primary_layer = self.svg.get_current_layer()
        
        style = {
            'stroke'        : 'none',
            'stroke-width'  : '1',
            'fill'          : '#000000'
        }
        attribs = {
            'id': "ha_city",
            'style'     : str(inkex.Style(style)),
            'transform' : 'translate({},{})'.format(x, y),
            'd': data['data']
        }
        etree.SubElement(primary_layer, inkex.addNS('path', 'svg'), attribs)


if __name__ == '__main__':
    HashCurve().run()
