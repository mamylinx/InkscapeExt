var makerjs = require('makerjs');
var opentype = require('opentype.js');
var parsePath = require('./parser-function.js');
var helpers = require('./helpers');

const args = process.argv.slice(2);
const text = args[0];
const font_family = args[1];
const min_font_size = parseInt(args[2]);
const max_font_size = parseInt(args[3]);
const letter_spacing = parseFloat(args[4]);
const arch_height = Math.max(parseInt(args[5]), 1);
const x = parseInt(args[6]);
const y = parseInt(args[7]);
const img_width = parseInt(args[8]);

function ArcText(font, text, arcRadius, startAngle, endAngle, onTop, tuning) {
  var fontSize = 720;
  var _opentypeOptions = {
    kerning: true,
    letterSpacing: letter_spacing
  };

  // generate the text using a font
  // font, text, fontSize, combine, centerCharacterOrigin, bezierAccuracy, opentypeOptions
  var textModel = new makerjs.models.Text(font, text, fontSize, false, true, '', _opentypeOptions);

  // Set font size to fit width
  fontSize *= img_width / makerjs.measure.modelExtents(textModel).width;

  //save all of these in the model
  var model = {
    models: {
      text: textModel = new makerjs.models.Text(font, text, fontSize, false, true, '', _opentypeOptions),
    }
  };

  //measure height of the text from the baseline
  // From Maker.js playground
  // https://maker.js.org/playground/?script=arc-text

  var measure = makerjs.measure.modelExtents(textModel);
  var height = measure.high[1];
  var h2 = height / 2;
  var left = measure.low[0];
  var right = measure.high[0];
  var textWidth = right - left;
  var arc = new makerjs.paths.Arc([0, 0], arcRadius, startAngle, endAngle);

  //move each character to a percentage of the total arc
  var span = makerjs.angle.ofArcSpan(arc);

  var text_length = text.length;
  for (var i = 0; i < text_length; i++) {
    var char = textModel.models[i];

    //get the x distance of each character as a percentage
    var distFromFirst = char.origin[0] - left;
    var center = distFromFirst / textWidth;

    //set a new origin at the center of the text
    var o = makerjs.point.add(char.origin, [0, h2]);
    makerjs.model.originate(char, o);

    //project the character x position into an angle
    var angle = center * span;
    var angleFromEnd = onTop ? endAngle - angle : startAngle + angle;
    var p = makerjs.point.fromAngleOnCircle(angleFromEnd, arc);
    char.origin = p;

    //rotate the char to 90 from tangent
    makerjs.model.rotate(char, onTop ? angleFromEnd - 90 : angleFromEnd + 90, p);
  }
  if (tuning === true) {
    // fit drawing into image width
    let measure1 = makerjs.measure.modelExtents(textModel);
    let scaleFactor = img_width / measure1.width;

    try {
      // fit font height
      model.models.text = makerjs.model.scale(textModel, scaleFactor);
      makerjs.model.originate(model.models.text, [0, 0]);

      measure.height *= scaleFactor;
      // Throw error if the height of font is too small
      if (measure.height < min_font_size) throw new Error("Rendering error");
    } catch (e) {
      console.error("Render issue: ", e.message,measure.height);
      process.exit(1)
    }
  }

  return model;
}

function renderSVG(font, text, arcRadius, startAngle, endAngle, tuning) {
  return makerjs.exporter.toSVG(ArcText(font, text, arcRadius, startAngle, endAngle, true, tuning), {
    fill: '#000000'
  })
}

var font = opentype.loadSync(font_family);
var radius = arch_height / 2 + Math.pow(img_width, 2) / (8 * arch_height);
var totalAngle = makerjs.angle.toDegrees(2 * Math.acos(1 - arch_height / radius));
var startAngle = 90 - totalAngle / 2;
var endAngle = totalAngle + startAngle;
var mergedNumbers = [],
  svgPoints = [];

// Try to render an svg font.
var svg = renderSVG(font, text, radius, startAngle, endAngle, false);

// Convert and extract coordinates from svg string
parsePath(helpers.getDataPath(svg)).forEach(
  e => svgPoints.push(e.data)
);

// Merge two dimensional array into one dimensional.
svgPoints.forEach(
  a => a.forEach(
    e => mergedNumbers.push(e)
  )
);

svgPoints = helpers.chunk(mergedNumbers, 2); //Split and group numbers in svg to X and Y coordinates

var extremRight = helpers.average(
  svgPoints.filter(e => e[0] > img_width / 2)
  .sort((a, b) => a[1] - b[1])
  .reverse()
  .slice(0, 2)
);

var extremLeft = helpers.average(
  svgPoints.filter(e => e[0] < img_width / 2)
  .sort((a, b) => a[1] - b[1])
  .reverse()
  .slice(0, 2)
);

startAngle += makerjs.angle.ofPointInDegrees(extremLeft, extremRight);

// Svg final render with good angle
svg = renderSVG(font, text, radius, startAngle, startAngle + totalAngle, true);

console.log(helpers.getDataPath(svg));
