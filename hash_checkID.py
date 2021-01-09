import inkex


class HashCheckID(inkex.EffectExtension):
    
    def effect(self):
        _root = self.document.getroot()
        msg = ""
        for obj in _root:
            _label = obj.get("inkscape:label")
            _id = obj.get("id")
            
            if None not in (_label, _id):
                msg += "label: " + _label + " .id: " + _id + "\n"
            else:
                msg += str(obj) + "\n"
                
            for child in obj:
                _child_label = child.get("inkscape:label")
                _child_id = child.get("id")
                
                if _child_id is None:
                    msg += "\t" + "Object: " + str(child) + " doesn't have ID " + "\n"
                elif _child_label is None:
                    msg += "\t" + "Object: " + str(child) + "#" + _child_id + " is not labelled " + "\n"
                else:
                    msg += "\t" + "Object: " + str(child) + "#" + _child_id + " has Id and is labelled\n"
                    
        inkex.errormsg(msg)

        
if __name__ == '__main__':
    HashCheckID().run()
