// Author: osublake
// https://codepen.io/osublake/pen/8eeed05320b9e183f719886283f3b12e
//
// PARSE PATH
// ========================================================================
var commandExp = /([achlmqstvz])\s*/i;
var valuesExp  = /(-?\d*\.?\d*(?:e[\-+]?\d+)?)[0-9]/ig;

module.exports = function parsePath(pathString) {

  var started = false;
  var path = [];
  var command;

  var params = {
    h: 1,
    v: 1,
    m: 2,
    l: 2,
    t: 2,
    q: 4,
    s: 4,
    c: 6,
    a: 7
  };

  pathString.split(commandExp).forEach(function(data) {

    if (!data) return;
    if (!started) {
      if (data === "M" || data === "m") {
        started = true;
        data = "M";
      } else return;
    }

    if (commandExp.test(data)) {
      command = data;

      if (command === "Z" || command === "z") {
        path.push({
          command: "z"
        });
      }

    } else {

      data = data.match(valuesExp);
      if (!data) return;

      data = data.map(Number);

      if (command === "M" || command === "m") {

        path.push({
          command: command,
          data: data.splice(0, 2)
        });
        command = command === "M" ? "L" : "l";
      }

      var pair = params[command.toLowerCase()];

      while (data.length) {
        path.push({
          command: command,
          data: data.splice(0, pair)
        });
      }
    }
  });

  return toCurves(path);
}

//
// TO CURVES
// ========================================================================
function toCurves(path) {

  path = pathToAbsolute(path);
  var attrs = {
    x: 0,
    y: 0,
    bx: 0,
    by: 0,
    X: 0,
    Y: 0,
    qx: null,
    qy: null
  };

  var processSegment = function(segment, d, pcom) {

    var nx, ny;
    var command = segment.command;
    var data = segment.data;
    if (!segment) {
      segment.command = "C";
      segment.data = [d.x, d.y, d.x, d.y, d.x, d.y];
      return;
    }!(command in {
      T: 1,
      Q: 1
    }) && (d.qx = d.qy = null);

    switch (command) {

      case "M":
        d.X = data[0];
        d.Y = data[1];
        break;

      case "A":
        data = arcToCurve.apply(0, [d.x, d.y].concat(data.slice()));
        break;

      case "S":
        if (pcom === "C" || pcom === "S") {
          nx = d.x * 2 - d.bx;
          ny = d.y * 2 - d.by;
        } else {
          nx = d.x;
          ny = d.y;
        }
        data = [nx, ny].concat(data.slice());
        break;

      case "T":
        if (pcom === "Q" || pcom === "T") {
          d.qx = d.x * 2 - d.qx;
          d.qy = d.y * 2 - d.qy;
        } else {
          d.qx = d.x;
          d.qy = d.y;
        }
        data = quadraticToCurve(d.x, d.y, d.qx, d.qy, data[0], data[1]);
        break;

      case "Q":
        d.qx = data[0];
        d.qy = data[1];
        data = quadraticToCurve(d.x, d.y, data[0], data[1], data[2], data[3]);
        break;

      case "L":
        data = lineToCurve(d.x, d.y, data[0], data[1]);
        break;

      case "H":
        data = lineToCurve(d.x, d.y, data[0], d.y);
        break;

      case "V":
        data = lineToCurve(d.x, d.y, d.x, data[0]);
        break;

      case "z":
        data = lineToCurve(d.x, d.y, d.X, d.Y);
        break;
    }

    if (command !== "M") segment.command = "C";
    segment.data = data;
  };

  var pcoms = [];
  var pfirst = "";
  var pcom = "";
  var ii = path.length || 0;

  var fixArc = function(pp, i) {
    if (pp[i].data && pp[i].data.length > 6) {
      var pi = pp[i].data;
      while (pi.length) {
        pcoms[i] = "A";
        pp.splice(i++, 0, {
          command: "C",
          data: pi.splice(0, 6)
        });
      }
      pp.splice(i, 1);
      ii = path.length || 0;
    }
  };

  for (var i = 0; i < ii; i++) {

    path[i] && (pfirst = path[i].command);

    if (pfirst !== "C") {
      pcoms[i] = pfirst;
      i && (pcom = pcoms[i - 1]);
    }

    processSegment(path[i], attrs, pcom);

    if (pcoms[i] !== "A" && pfirst === "C") pcoms[i] = "C";

    fixArc(path, i);

    var seg = path[i].data;
    var len = seg && (seg.length || 0);

    attrs.x = seg[len - 2];
    attrs.y = seg[len - 1];
    attrs.bx = parseFloat(seg[len - 4] || attrs.x);
    attrs.by = parseFloat(seg[len - 3] || attrs.y);
  }

  return path;
}

//
// PATH TO ABSOLUTE
// ========================================================================
function pathToAbsolute(path) {

  var currentPoint = [0, 0];
  var subpathPoint = [0, 0];

  function set(dest, source) {
    dest[0] = source[source.length - 2];
    dest[1] = source[source.length - 1];
    return dest;
  }

  path = path.map(function(segment) {

    var command = segment.command;
    var data = segment.data && segment.data.slice();

    switch (command) {

      case "a":
        data[5] += currentPoint[0];
        data[6] += currentPoint[1];
        set(currentPoint, data);
        break;

      case "h":
        data[0] += currentPoint[0];
        currentPoint[0] = data[0];
        break;

      case "v":
        data[0] += currentPoint[1];
        currentPoint[1] = data[0];
        break;

      case "z":
        set(currentPoint, subpathPoint);
        break;

      case "H":
        currentPoint[0] = data[0];
        break;

      case "M":
        set(currentPoint, data);
        set(subpathPoint, data);
        break;

      case "V":
        currentPoint[1] = data[0];
        break;

      default:

        if ("mlcsqt".indexOf(command) > -1) {
          for (var i = 0; i < data.length; i++) {
            data[i] += currentPoint[i % 2];
          }

          set(currentPoint, data);

          if (command === "m") {
            set(subpathPoint, data);
          }
        }

        if ("MLCSQTAZ".indexOf(command) > -1) {
          set(currentPoint, data);
        }
    }

    return command === "z" ?
      {
        command: "z"
      } :
      {
        command: command.toUpperCase(),
        data: data
      };
  });

  return path;
}

//
// LINE TO CURVE
// ========================================================================
function lineToCurve(x1, y1, x2, y2) {
  return [x1, y1, x2, y2, x2, y2];
}

//
// QUADRATIC TO CURVE
// ========================================================================
function quadraticToCurve(x1, y1, ax, ay, x2, y2) {
  var _13 = 1 / 3,
    _23 = 2 / 3;
  return [
    _13 * x1 + _23 * ax,
    _13 * y1 + _23 * ay,
    _13 * x2 + _23 * ax,
    _13 * y2 + _23 * ay,
    x2,
    y2
  ];
}

//
// ARC TO CURVE
// ========================================================================
function arcToCurve(x1, y1, rx, ry, angle, large_arc_flag, sweep_flag, x2, y2, recursive) {

  // Taken from Snap.js
  var _120 = Math.PI * 120 / 180,
    rad = Math.PI / 180 * (+angle || 0),
    res = [],
    xy,
    rotate = function(x, y, rad) {
      var X = x * Math.cos(rad) - y * Math.sin(rad);
      var Y = x * Math.sin(rad) + y * Math.cos(rad);
      return {
        x: X,
        y: Y
      };
    };

  if (!recursive) {
    xy = rotate(x1, y1, -rad);
    x1 = xy.x;
    y1 = xy.y;
    xy = rotate(x2, y2, -rad);
    x2 = xy.x;
    y2 = xy.y;
    var cos = Math.cos(Math.PI / 180 * angle),
      sin = Math.sin(Math.PI / 180 * angle),
      x = (x1 - x2) / 2,
      y = (y1 - y2) / 2;
    var h = (x * x) / (rx * rx) + (y * y) / (ry * ry);
    if (h > 1) {
      h = Math.sqrt(h);
      rx = h * rx;
      ry = h * ry;
    }
    var rx2 = rx * rx,
      ry2 = ry * ry,
      k = (large_arc_flag == sweep_flag ? -1 : 1) *
      Math.sqrt(Math.abs((rx2 * ry2 - rx2 * y * y - ry2 * x * x) / (rx2 * y * y + ry2 * x * x))),
      cx = k * rx * y / ry + (x1 + x2) / 2,
      cy = k * -ry * x / rx + (y1 + y2) / 2,
      f1 = Math.asin(((y1 - cy) / ry).toFixed(9)),
      f2 = Math.asin(((y2 - cy) / ry).toFixed(9));

    f1 = x1 < cx ? Math.PI - f1 : f1;
    f2 = x2 < cx ? Math.PI - f2 : f2;
    f1 < 0 && (f1 = Math.PI * 2 + f1);
    f2 < 0 && (f2 = Math.PI * 2 + f2);
    if (sweep_flag && f1 > f2) {
      f1 = f1 - Math.PI * 2;
    }
    if (!sweep_flag && f2 > f1) {
      f2 = f2 - Math.PI * 2;
    }
  } else {
    f1 = recursive[0];
    f2 = recursive[1];
    cx = recursive[2];
    cy = recursive[3];
  }
  var df = f2 - f1;
  if (Math.abs(df) > _120) {
    var f2old = f2,
      x2old = x2,
      y2old = y2;
    f2 = f1 + _120 * (sweep_flag && f2 > f1 ? 1 : -1);
    x2 = cx + rx * Math.cos(f2);
    y2 = cy + ry * Math.sin(f2);
    res = arcToCurve(x2, y2, rx, ry, angle, 0, sweep_flag, x2old, y2old, [f2, f2old, cx, cy]);
  }
  df = f2 - f1;
  var c1 = Math.cos(f1),
    s1 = Math.sin(f1),
    c2 = Math.cos(f2),
    s2 = Math.sin(f2),
    t = Math.tan(df / 4),
    hx = 4 / 3 * rx * t,
    hy = 4 / 3 * ry * t,
    m1 = [x1, y1],
    m2 = [x1 + hx * s1, y1 - hy * c1],
    m3 = [x2 + hx * s2, y2 - hy * c2],
    m4 = [x2, y2];
  m2[0] = 2 * m1[0] - m2[0];
  m2[1] = 2 * m1[1] - m2[1];
  if (recursive) {
    return [m2, m3, m4].concat(res);
  } else {
    res = [m2, m3, m4].concat(res).join().split(",");
    var newres = [];
    for (var i = 0, ii = res.length; i < ii; i++) {
      newres[i] = i % 2 ? rotate(res[i - 1], res[i], rad).y : rotate(res[i], res[i + 1], rad).x;
    }
    return newres;
  }
}
