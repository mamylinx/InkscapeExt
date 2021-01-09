import inkex


class HashLabelise(inkex.EffectExtension):

    def add_arguments(self, pars):
        pars.add_argument("--prefix_id", type=str, default="hash",
                          help="Default prefix for id and label")
        
    def effect(self):
        _root = self.document.getroot()
        msg = ""
        _eNumber = 1
        
        for obj in _root:
            _label = obj.get("inkscape:label")
            _id = obj.get("id")
            prefix_id = self.options.prefix_id
                
            for child in obj:
                _child_label = child.get("inkscape:label")
                _child_id = child.get("id")
                
                if _child_id is None:
                    child.attrib["id"] = prefix_id + str(_eNumber)
                elif _child_label is None:
                    child.attrib[inkex.addNS('label', 'inkscape')] = "#" + prefix_id + str(_eNumber)
                else:
                    msg += "\t" + "Object: " + str(child) + "#" + _child_id + " has Id and is labelled\n"
                    
                _eNumber += 1
                
        if msg is not None:
            inkex.errormsg(msg) 

        
if __name__ == '__main__':
    HashLabelise().run()
