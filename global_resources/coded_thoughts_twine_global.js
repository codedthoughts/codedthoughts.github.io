(function () {
    $(document).on('keyup', function (ev) {
        if (ev.key === 'Enter') {
					if (State.getVar("$acmd") != "") {
          	  Wikifier.wikifyEval('<<include "commandparser">>');
			 		} else {
			 			Wikifier.wikifyEval("<<dialog 'aOS CMD'>><<include 'commandinput'>><</dialog>>");
					}
        }
			  if (ev.key === 'Escape') {
					Dialog.close()
        }
    });
}());

// If flag exists then return value, else return false
window.Flag = function (Fnam) {
	if (State.variables.Flags == undefined) {
		State.variables.Flags = {};
	} else if (State.variables.Flags[Fnam.toLowerCase()] !== undefined) {
		return State.variables.Flags[Fnam.toLowerCase()];
	};
	return false;
};

Macro.add('percent', {
		handler: function(){
			var res = ((100 * this.args[0]) / this.args[1]);
			var res = res+"%"
			jQuery(this.output).wiki(res);
			return res
		}
});
					
var toggleMature = function () {
	if (settings.mature) { // is true
		State.setVar("$mature", true)
		Wikifier.wikifyEval('<<notify>>The world becomes a darker place.<</notify>>');
	}
	else { // is false
		State.setVar("$mature", false)
		Wikifier.wikifyEval('<<notify>>The world feels cleaner.<</notify>>');
	}
};

var toggleMusic = function () {
	if (settings.music) { // is true
		State.setVar("$music", true)
		Wikifier.wikifyEval('<<notify>>You hear the world again.<</notify>>');
	}
	else { // is false
		State.setVar("$music", false)
		Wikifier.wikifyEval('<<audio ":playing" stop>>');
		Wikifier.wikifyEval('<<notify>>Suddenly the world went quiet.<</notify>>');
	}
};

Setting.addToggle("mature", {
	label : "Content for mature audiences?",
	onChange : toggleMature
});

Setting.addToggle("music", {
	label 		: "Play music ingame?",
	default		: true,
	onChange 	: toggleMusic
});

Config.saves.isAllowed = function () {
	return tags().contains("savable");
};

postdisplay['hidden-link-setup'] = function () {
    /*
        Hidden links that are always hidden:
            <span class="hidden">[[A hidden link]]</span>
    */
    $('.hidden')
        .addClass('hidden');

    /*
        Hidden links that hide unless you're hovering over them:
            <span class="hides">[[A hidden link]]</span>
    */
    $('.hides')
        .addClass('hidden')
        .on('mouseenter', function () {
            $(this).removeClass('hidden');
        })
        .on('mouseleave', function () {
            $(this).addClass('hidden');
        });

    /*
        Hidden links that reveal themselves when you hover over them:
            <span class="reveals">[[A hidden link]]</span>
    */
    $('.reveals')
        .addClass('hidden')
        .one('mouseenter', function () {
            $(this).removeClass('hidden');
        });
};

// operations, by chapel; for sugarcube 2.x
// v1.0.0
// adds a dice roller and 'fairmath'

// options object
setup.operations = {
    tryGlobal : true, 
    nicknames : true, 
    fmRange   : [0, 100]
};

/*

    I couldn't decide on which syntax mode was best, expecially for dice.
    So I wound up including a bunch of options, and they all work essentially the same way.
    Though the dice 'parser' [e.g. dice('string')] syntax and the shortcuts [e.g. x.fm(), x.d()]
    perform slightly worse / are slightly slower than the other potential syntax modes.

    Supported syntax:
        1. the dice roller: (all the following work and are all equivalent to '3d6+10')
            a. dice(3, 6) + 10
            b. dice('3d6 + 10')
            c. dice('3d6+10')
            d. dice('3d6') + 10
            e. (3).dice(6) + 10
            f. (3).d(6) + 10
            g. !!! dice('3d6' + 10) -- Will roll 3 610-sided dice; the parser can't accept mixed arguments
        2. the fairmath system (based on the ChoiceScript stats system)
            a. (100).fairmath(-20)  [=80]
            b. (90).fm(20)          [=92]
            c. Math.fm(50, 40)      [=70]
            d. Math.fairmath(0, 10) [=10]
        3. Notes.
            a. dice() is also available as setup.dice.roll()
            b. you only need to use parens on bare numbers, none are required for variables
            c. be careful! rolling dice with floating point numbers or negatives will cause errors
            d. likewise, fairmath will spit out errors if it's given bizarre numbers
    
    Options:
        tryGlobal : sends setup.dice.roll() to the global scope as dice() if true
        nicknames : include the shorter method calls [Math.fm(), <number>.fm(), and <number>.d()]
        fmRange   : move the minimum and maximum range for the fairmath system, if you need to
                    note that the results are constrained by this range, but can never actually hit it
                    that is, [0, 100] will limit the actual numbers to 1-99, 
                    [10, 45] would limit the results to 11-44, etc.
        
*/

/*                  DICE                    */

// dice helpers
setup.dice = {
    processDice : function (a, b) {
        // find the number of dice and the type of die
        var roll = [], i, result = 0;
        if (typeof a === 'string') {
            roll = a.split('d');
        } else if (typeof a === 'number' && b) {
            roll = [a, b];
        } else if (Array.isArray(a) && a.length >= 2) {
            a.length = 2;
            roll = a;
        } else {
            throw new TypeError('setup.dice.processDice(): could not process arguments...');
        }
        for (i = 0; i < roll[0]; i++) {
            /*
                we're going to roll each die.  we could generate a number
                between the max and min possible simply enough,
                but real dice have weights -- rolling 3d6 is far more likely to result 
                in 10 or 11 than in 3 or 18, and pure randomization will not emulate this
            */
            var die = 0;
            die = Math.floor(Math.random() * roll[1]) + 1;
            result += die; // update result
        }
        return result; // this prelimary result ignores modifiers; it only rolls the dice
    },
    processString : function (string) {
        // recieves strings like '1d6 + 6' or 1d20+3'
        var parsed = [];
        // remove all whitespace and trim
        string = string.trim().replace(/\s/g, '');
        // check for and return the parts of the roll (2 chunks: '1d6' and '+6')
        parsed = string.match(/(\d*d\d*)(.*)/);
        return [parsed[1], Number(parsed[2])]; // send the data off as an array
    },
    roll : function (a, b) {
        if (typeof a === 'string') {
            var result = setup.dice.processString(a);
            /* 
                the expression below rolls the dice and adds the modifier, 
                which must be additive (i.e. +5 or -5, but never *5)
            */
            return setup.dice.processDice(result[0]) + result[1];
        } else {
            // just run it, it'll toss out its own errors
            return setup.dice.processDice(a, b);
        }
    }
};

// global dice() function; dice('[x]d[y] +/- [z]') -or- dice(2, 10) [2d10]
// ex. $var = dice('2d10+5'); _var = dice('3d6 - 1'); _var = dice(3, 6) + 10; etc
if (setup.operations.tryGlobal) { // test options
    window.dice = window.dice || setup.dice.roll; 
}
// send to global scope without breaking anything
// always available via setup.dice.roll() when unavailable here

// dice method; Number.prototype.dice(number)
// ex. (1).dice(6) + 10; $roll = $die.number.dice($die.type); etc
if (!Number.prototype.dice) {
    Object.defineProperty(Number.prototype, 'dice', {
        configurable : true,
        writable     : true,
        
        value : function (val) {
            // errors and weirdness
            if (this === 0) {
                return 0;
            } 
            if (this < 0) {
                throw new TypeError('Number.prototype.dice: cannot roll a negative number of dice!');
            }
            if (val == null || typeof val != 'number' || val <= 0 || arguments.length < 1) {
                throw new TypeError('Number.prototype.dice: error in argument');
            }
            if (!Number.isInteger(this) || !Number.isInteger(val)) {
                throw new TypeError('Number.prototype.dice: cannot roll partial dice!');
            }
            
            // call the dice processing function
            return setup.dice.processDice(this, val);
        }
    });
}

/*                  FAIRMATH                */

// fairmath method; Number.prototype.fairmath(value)
// ex. (20).fairmath(30); $var = $var.fairmath(-10); etc 
if (!Number.prototype.fairmath) {
    Object.defineProperty(Number.prototype, 'fairmath', {
        configurable : true,
        writable     : true,
        
        value : function (val) {
            // errors
            var op = setup.operations.fmRange;
            
            if (this < op[0] || this > op[1]) {
                throw new TypeError('Number.prototype.fairmath called on a number that is out of the defined range (the number was ' + this + ').');
            }
            if (val == null || typeof val != 'number' || val > 100 || val < -100 || arguments.length < 1) {
                throw new TypeError('Number.prototype.fairmath given incorrect argument or an argument that is out of the valid 0-100 range.');
            }
            
            // do the 'fair' math!
            if (val === 0) { // a 0 increase or decrease; just trunc and clamp
                return Math.clamp(Math.trunc(this), op[0], op[1]);
            }
            if (val < 0) { // number is negative, representing a decrease
                val = val * -1; // make positive for the math below
                return Math.clamp(Math.trunc(
                    this - ((this - op[0]) * (val / op[1]))
                ), op[0], op[1]);
            }
            if (val > 0) { // number is positive, represeting an increase
                return Math.clamp(Math.trunc(
                    this + ((op[1] - this) * (val / op[1]))
                ), op[0], op[1]);
            }
            // something inexplicable happened
            throw new Error('Number.prototype.fairmath encountered an unspecified error.');
        }
    });
}

// Math.fairmath() method 
if (!Math.fairmath) {
    Object.defineProperty(Math, 'fairmath', {
        configurable : true,
        writable     : true,
        
        value : function (base, val) { 
            return base.fairmath(val);
        }
    });
}

/*                  EXTRAS                  */

// now for some shortcuts
if (setup.operations.nicknames) {
    if (!Math.fm) { // Math.fm()
        Object.defineProperty(Math, 'fm', {
            configurable : true,
            writable     : true,
            
            value : function (base, val) { 
                return base.fairmath(val);
            }
        });
    }
    if (!Number.prototype.fm) { // <number>.fm()
        Object.defineProperty(Number.prototype, 'fm', {
            configurable : true,
            writable     : true,
            
            value : function (val) { 
                return this.fairmath(val);
            }
        });
    }
    if (!Number.prototype.d) { // <number>.d()
        Object.defineProperty(Number.prototype, 'd', {
            configurable : true,
            writable     : true,
        
            value : function (val) { 
                return this.dice(val);
            }
        });
    }
}
// mouseover.min.js, for SugarCube 2, by Chapel
;Macro.add("mouseover",{tags:["onhover","onmouseover","onmousein","onmouseenter","onmouseout"],skipArgs:!0,handler:function(){if(this.payload.length<2)return this.error("No event tag used.");var e={mouseover:[],mousein:[],mouseout:[]},o=$(document.createElement("span")).addClass("macro-"+this.name).wiki(this.payload[0].contents).appendTo(this.output);this.payload.forEach(function(o){switch(o.name){case"onhover":case"onmouseover":e.mouseover.push(o.contents);break;case"onmousein":case"onmouseenter":e.mousein.push(o.contents);break;case"onmouseout":e.mouseout.push(o.contents);break;default:return}}),e.mouseover.length&&o.on("mouseover",function(o){$.wiki(e.mouseover.join(" "))}),e.mousein.length&&o.on("mouseenter",function(o){$.wiki(e.mousein.join(" "))}),e.mouseout.length&&o.on("mouseout",function(o){$.wiki(e.mouseout.join(" "))})}});
// end mouseover.min.js


// notify.js, by chapel; for sugarcube 2
// version 1.0.0
// requires notify.css / notify.min.css

$(document.body).append("<div id='notify'></div>");
$(document).on(':notify', function (e) {
    if (e.message && typeof e.message === 'string') {
        // trim message
        e.message.trim();
        // classes
        if (e.class) {
            if (typeof e.class === 'string') {
                e.class = 'open macro-notify ' + e.class;
            } else if (Array.isArray(e.class)) {
                e.class = 'open macro-notify ' + e.class.join(' ');
            } else {
                e.class = 'open macro-notify';
            }
        } else {
            e.class = 'open macro-notify';
        }
        
        // delay
        if (e.delay) {
            if (typeof e.delay !== 'number') {
                e.delay = Number(e.delay)
            }
            if (Number.isNaN(e.delay)) {
                e.delay = 2000;
            }
        } else {
            e.delay = 2000;
        }
        
        $('#notify')
            .empty()
            .wiki(e.message)
            .addClass(e.class)
                
        setTimeout(function () {
            $('#notify').removeClass();
        }, e.delay);
    }
});

// <<notify delay 'classes'>> message <</notify>>
Macro.add('notify', {
       tags : null,
    handler : function () {
        
        // set up
        var msg     = this.payload[0].contents, 
            time    = false, 
            classes = false, i;
        
        // arguments
        if (this.args.length > 0) {
            if (typeof this.args[0] === 'number') {
                time    = this.args[0];
                classes = (this.args.length > 1) ? this.args.slice(1).flatten() : false;
            } else {
                classes = this.args.flatten().join(' ');
            }
        }
        
        // fire event
        $(document).trigger({
            type    : ':notify',
            message : msg,
            delay   : time,
            class   : classes
        });
        
    }
});

// dialog API macro set, by chapel; for sugarcube 2
// version 1.2.0
// see the documentation: https://github.com/ChapelR/custom-macros-for-sugarcube-2#dialog-api-macros

// <<dialog>> macro
Macro.add('dialog', {
       tags : null,
    handler : function () {
        
        // handle args (if any)
        var content = (this.payload[0].contents) ? this.payload[0].contents : '';
        var title = (this.args.length > 0) ? this.args[0] : '';
        var classes = (this.args.length > 1) ? this.args.slice(1).flatten() : [];
        
        // add the macro- class
        classes.push('macro-' + this.name);
        
        // dialog box
        Dialog.setup(title, classes.join(' '));
        Dialog.wiki(content);
        Dialog.open();
        
    }

});

// <<popup>> macro
Macro.add('popup', {
    handler : function () {
        
        // errors
        if (this.args.length < 1) {
            return this.error('need at least one argument; the passage to display');
        }
        if (!Story.has(this.args[0])) {
            return this.error('the passage ' + this.args[0] + 'does not exist');
        }
        
        // passage name and title
        var psg   = this.args[0];
        var title = (this.args.length > 1) ? this.args[1] : '';
        var classes = (this.args.length > 2) ? this.args.slice(2).flatten() : [];
        
        // add the macro- class
        classes.push('macro-' + this.name);
        
        // dialog box
        Dialog.setup(title, classes.join(' '));
        Dialog.wiki(Story.get(psg).processText());
        Dialog.open();
        
    }

});

// simple-inventory.min.js, for SugarCube 2, by Chapel
;setup.simpleInv={},setup.simpleInv.options={tryGlobal:!0,defaultStrings:{empty:"The inventory is empty...",listDrop:"Discard",separator:"\n"}},setup.simpleInv.attachEvent=function(i,t,n,r){$(document).trigger({type:"initialized"===r?":inventory-init":":inventory-update",instance:i,receiving:t,moved:n,context:r})},setup.simpleInv.inventory=function(i){"use strict";if(i=i?(i=[].slice.call(arguments)).flatten():[],!(this instanceof setup.simpleInv.inventory))return new setup.simpleInv.inventory(i);i=(this.inv=i).length?i:null,setup.simpleInv.attachEvent(this,null,i,"initialized")},setup.simpleInv.inventory.is=function(i){return i instanceof setup.simpleInv.inventory},setup.simpleInv.inventory.log=function(i){return setup.simpleInv.inventory.is(i)?"Inventory.log() -> "+i.toArray().join(" - "):"Inventory.log() -> object is not an inventory..."},setup.simpleInv.inventory.removeDuplicates=function(i){if(setup.simpleInv.inventory.is(i)){var t,n=i.toArray();return t=[],n.forEach(function(i){t.includes(i)||t.push(i)}),t}},setup.simpleInv.inventory.getUID=function(i,t){var n=Math.random().toString(36).substring(7);return arguments.length<2&&(i=Math.random().toString(36).substring(7),t=random(99)),"simple-inv-"+t+"-"+Date.now()+"-"+i.replace(/[^A-Za-z0-9]/g,"")+"-"+n},setup.simpleInv.inventory.prototype={transfer:function(i){if(arguments.length<2)return this;if(!(i instanceof setup.simpleInv.inventory))return this;for(var t=[].slice.call(arguments),n=[],r=0,e=(t=t.slice(1).flatten()).length;r<e;r++)this.inv.includes(t[r])&&(this.inv.delete(t[r]),n.push(t[r]));return n.length&&(i.inv=i.inv.concat(n),setup.simpleInv.attachEvent(this,i,n,"transfer")),this},has:function(){var i=[].slice.call(arguments).flatten();return!(!i||!i.length)&&this.inv.includesAny(i)},hasAll:function(){var i=[].slice.call(arguments).flatten();return!(!i||!i.length)&&this.inv.includesAll(i)},pickUp:function(i){var t,n=[].slice.call(arguments).flatten(),r=this;return n&&n.length&&("unique"!==i&&"unique"!==n[0]||(n=n.splice(1),t=[],n.forEach(function(i){r.inv.includes(i)||t.includes(i)||t.push(i)}),n=t),this.inv=this.inv.concat(n),setup.simpleInv.attachEvent(this,null,n,"pickup")),this},drop:function(){var t,i=[].slice.call(arguments).flatten(),n=this;if(i&&i.length){var r=[];i.forEach(function(i){n.has(i)&&(r.push(i),t=n.inv.indexOf(i),n.inv.deleteAt(t))}),setup.simpleInv.attachEvent(this,null,r,"drop")}return this},sort:function(){return this.inv=this.inv.sort(),setup.simpleInv.attachEvent(this,null,null,"sort"),this},show:function(i){return i&&"string"==typeof i||(i=setup.simpleInv.options.defaultStrings.separator),this.inv.length?this.inv.join(i):setup.simpleInv.options.defaultStrings.empty},empty:function(){var i=clone(this.inv);return this.inv=[],setup.simpleInv.attachEvent(this,null,i,"drop"),this},toArray:function(){return this.inv},count:function(t){if(t&&"string"==typeof t){var n=0;return this.toArray().forEach(function(i){i===t&&n++}),n}return this.toArray().length},isEmpty:function(){return 0===this.toArray().length},linkedList:function(o,l){o&&o instanceof setup.simpleInv.inventory||(o=!1);var i=this.toArray(),u=this,v=$(document.createElement("span"));return i&&i.length?i.forEach(function(i,t,n){var r=$(document.createElement("span")),e=$(document.createElement("a")),s=l||setup.simpleInv.options.defaultStrings.drop,a=setup.simpleInv.inventory.getUID(i,t);e.wiki(s).addClass("simple-inv drop-link"),e.ariaClick(function(){o?u.transfer(o,i):u.drop(i),$("#"+a).empty()}),r.attr("id",a).addClass("simple-inv link-listing").wiki(i+" ").append(e),t<n.length-1&&r.wiki("<br />"),v.append(r)}):v.wiki(setup.simpleInv.options.defaultStrings.empty),v},constructor:setup.simpleInv.inventory,toJSON:function(){return JSON.reviveWrapper("new setup.simpleInv.inventory("+JSON.stringify(this.inv)+")")},clone:function(){return new setup.simpleInv.inventory(this.inv)}},setup.simpleInv.options.tryGlobal&&(window.Inventory=window.Inventory||setup.simpleInv.inventory),Macro.add("newinventory",{handler:function(){if(this.args.length<1)return this.error("incorrect number of arguments");var i=this.args[0].trim();if("$"!==i[0]&&"_"!==i[0])return this.error('variable name "'+this.args[0]+'" is missing its sigil ($ or _)');Wikifier.setValue(i,new setup.simpleInv.inventory(this.args.slice(1).flatten()))}}),Macro.add("pickup",{handler:function(){if(this.args.length<2)return this.error("incorrect number of arguments");var i=this.args[0].trim();if("$"!==i[0]&&"_"!==i[0])return this.error('variable name "'+this.args[0]+'" is missing its sigil ($ or _)');var t=Wikifier.getValue(i);if(!setup.simpleInv.inventory.is(t))return this.error("variable "+i+" is not an inventory!");t.pickUp(this.args.slice(1).flatten())}}),Macro.add("drop",{handler:function(){if(this.args.length<2)return this.error("incorrect number of arguments");var i=this.args[0].trim();if("$"!==i[0]&&"_"!==i[0])return this.error('variable name "'+this.args[0]+'" is missing its sigil ($ or _)');var t=Wikifier.getValue(i);if(!setup.simpleInv.inventory.is(t))return this.error("variable "+i+" is not an inventory!");t.drop(this.args.slice(1).flatten())}}),Macro.add("transfer",{handler:function(){if(this.args.length<3)return this.error("incorrect number of arguments");var i=this.args[0].trim();if("$"!==i[0]&&"_"!==i[0])return this.error('variable name "'+this.args[0]+'" is missing its sigil ($ or _)');var t=Wikifier.getValue(i);if(!setup.simpleInv.inventory.is(t))return this.error("variable "+i+" is not an inventory!");var n=this.args[1].trim();if("$"!==n[0]&&"_"!==n[0])return this.error('variable name "'+this.args[1]+'" is missing its sigil ($ or _)');var r=Wikifier.getValue(n);if(!setup.simpleInv.inventory.is(r))return this.error("variable "+n+" is not an inventory!");t.transfer(r,this.args.slice(2).flatten())}}),Macro.add("dropall",{handler:function(){if(1!==this.args.length)return this.error("incorrect number of arguments");var i=this.args[0].trim();if("$"!==i[0]&&"_"!==i[0])return this.error('variable name "'+this.args[0]+'" is missing its sigil ($ or _)');var t=Wikifier.getValue(i);if(!setup.simpleInv.inventory.is(t))return this.error("variable "+i+" is not an inventory!");t.empty()}}),Macro.add("clear","dropall",!1),Macro.add("sort",{handler:function(){if(1!==this.args.length)return this.error("incorrect number of arguments");var i=this.args[0].trim();if("$"!==i[0]&&"_"!==i[0])return this.error('variable name "'+this.args[0]+'" is missing its sigil ($ or _)');var t=Wikifier.getValue(i);if(!setup.simpleInv.inventory.is(t))return this.error("variable "+i+" is not an inventory!");t.sort()}}),Macro.add("inventory",{handler:function(){if(this.args.length<1||2<this.args.length)return this.error("incorrect number of arguments");var i=this.args[0].trim();if("$"!==i[0]&&"_"!==i[0])return this.error('variable name "'+this.args[0]+'" is missing its sigil ($ or _)');var t=Wikifier.getValue(i);if(!setup.simpleInv.inventory.is(t))return this.error("variable "+i+" is not an inventory!");var n=$(document.createElement("span")),r=!!this.args[1]&&this.args[1];n.wiki(t.show(r)).addClass("macro-"+this.name).appendTo(this.output)}}),Macro.add("linkedinventory",{handler:function(){if(this.args.length<2||3<this.args.length)return this.error("incorrect number of arguments");var i=!1,t=this.args[1].trim(),n="string"==typeof this.args[0]&&this.args[0];if(!n)return this.error("first argument should be the link text");if("$"!==t[0]&&"_"!==t[0])return this.error('variable name "'+this.args[1]+'" is missing its sigil ($ or _)');var r=Util.slugify(t);r=this.name+"-"+r;var e=Wikifier.getValue(t);if(!setup.simpleInv.inventory.is(e))return this.error("variable "+t+" is not an inventory!");if(2<this.args.length){var s=this.args[2].trim();if("$"!==s[0]&&"_"!==s[0])return this.error('variable name "'+this.args[2]+'" is missing its sigil ($ or _)');if(i=Wikifier.getValue(s),!setup.simpleInv.inventory.is(i))return this.error("variable "+s+" is not an inventory!")}e.linkedList(i,n).attr("id",r).addClass("macro-"+this.name).appendTo(this.output)}});
// end simple-inventory.min.js

// ui-macro.min.js, for SugarCube 2, by Chapel
;!function(){var a={update:UIBar.setStoryElements,stow:UIBar.stow,unstow:UIBar.unstow,toggle:function(){$("#ui-bar").hasClass("stowed")?UIBar.unstow():UIBar.stow()},hide:function(){$("#ui-bar").css("display","none")},show:function(){$("#ui-bar").css("display","block")},kill:function(){$("#ui-bar").css("display","none"),$("#story").css("margin-left","2.5em")},restore:function(){$("#ui-bar").css("display","block"),$("#story").css("margin-left","20em")},jump:UI.jumpto,saves:UI.saves,restart:UI.restart,settings:UI.settings,share:UI.share,aliases:{refresh:"update",reload:"update",destroy:"kill",revive:"restore",jumpto:"jump",save:"saves",load:"saves",setting:"settings",sharing:"share"}},e=Object.keys(a);function t(s){return s&&"string"==typeof s?(s=s.toLowerCase().trim(),t=s,e.includes(t)||(r=s,s=a.aliases[r]||null)?(a[s](),!1):'Command "'+s+'" is not a valid command.'):"Command is not a string.";var r,t}Macro.add("ui",{handler:function(){Array.isArray(this.args)&&this.args.length||this.error("No commands passed to macro.");var s,r=function(s){if(!Array.isArray(s))return"Command list error.";var r=[];return s.forEach(function(s){r.push(t(s))}),r}(this.args.flatten());s=(r=r.filter(function(s){return"string"==typeof s})).join(" "),r.length&&s&&this.error(s)}})}();
// end ui-macro.min.js

// message-macro.min.js, for SugarCube 2, by Chapel
;setup.messageMacro={},setup.messageMacro.default="Help",Macro.add("message",{tags:null,handler:function(){var e=this.payload[0].contents,a=$(document.createElement("span")),s=$(document.createElement(this.args.includes("btn")?"button":"a")),t=$(document.createElement("span"));s.wiki(0<this.args.length&&"btn"!==this.args[0]?this.args[0]:setup.messageMacro.default).ariaClick(function(){a.hasClass("open")?t.css("display","none").empty():t.css("display","block").wiki(e),a.toggleClass("open")}),a.attr("id","macro-"+this.name+"-"+this.args.join("").replace(/[^A-Za-z0-9]/g,"")).addClass("message-text").append(s).append(t).appendTo(this.output)}});
// end message-macro.min.js

/*! typed.js integration module for SugarCube */
!function(){"use strict";function getInlineOptions(classNames){var options={},typedRe=/^typed(?:-(\w+))+\b$/,parseRe=/-(speed|delay)(\d+)\b/g,match=void 0;if("typed"!==classNames)for(var classOpts=classNames.toLowerCase().split(/\s+/),i=0;i<classOpts.length;++i)if(typedRe.test(classOpts[i])){for(;null!==(match=parseRe.exec(classOpts[i]));)switch(match[1]){case"speed":options.typeSpeed=Number(match[2]);break;case"delay":options.startDelay=Number(match[2])}break}return options}function typedCallbackFactory(el,callback){return function(){var $outer=jQuery(el),$inner=jQuery('<div class="typedjs-text-wrapper" style="display:block;position:absolute;left:0;top:0;"><span class="typed"></span></div>'),$source=$outer.children('[class|="typed"]'),options=jQuery.extend({strings:["^0 "+$source.html()],typeSpeed:40,startDelay:400,onComplete:function(){$inner.children(".typed-cursor").remove(),callback()},preStringTyped:function(){jQuery.event.trigger(":typedstart")},onStringTyped:function(){jQuery.event.trigger(":typedstop")}},getInlineOptions($source.attr("class")));$outer.append($inner),new Typed($inner.children()[0],options)}}postrender[":typedSetupHandler"]=function(content){jQuery(content).find('[class|="typed"]').addClass("typed").css("visibility","hidden").wrap('<div class="typedjs-outer-wrapper" style="display:block;position:relative;"></div>')},postdisplay[":typedAnimationHandler"]=function(){var $elements=jQuery("#passages .typedjs-outer-wrapper");if(0!==$elements.length){for(var callback=function(){jQuery.event.trigger(":typedcomplete")},i=$elements.length-1;i>=0;--i)callback=typedCallbackFactory($elements[i],callback);callback()}}}();
!function(){(function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.Typed=e():t.Typed=e()})(this,function(){return function(t){function e(n){if(s[n])return s[n].exports;var i=s[n]={exports:{},id:n,loaded:!1};return t[n].call(i.exports,i,i.exports,e),i.loaded=!0,i.exports}var s={};return e.m=t,e.c=s,e.p="",e(0)}([function(t,e,s){"use strict";function n(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}Object.defineProperty(e,"__esModule",{value:!0});var i=function(){function t(t,e){for(var s=0;s<e.length;s++){var n=e[s];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}return function(e,s,n){return s&&t(e.prototype,s),n&&t(e,n),e}}(),r=s(1),o=s(3),a=function(){function t(e,s){n(this,t),r.initializer.load(this,s,e),this.begin()}return i(t,[{key:"toggle",value:function(){this.pause.status?this.start():this.stop()}},{key:"stop",value:function(){this.typingComplete||this.pause.status||(this.toggleBlinking(!0),this.pause.status=!0,this.options.onStop(this.arrayPos,this))}},{key:"start",value:function(){this.typingComplete||this.pause.status&&(this.pause.status=!1,this.pause.typewrite?this.typewrite(this.pause.curString,this.pause.curStrPos):this.backspace(this.pause.curString,this.pause.curStrPos),this.options.onStart(this.arrayPos,this))}},{key:"destroy",value:function(){this.reset(!1),this.options.onDestroy(this)}},{key:"reset",value:function(){var t=arguments.length<=0||void 0===arguments[0]||arguments[0];clearInterval(this.timeout),this.replaceText(""),this.cursor&&this.cursor.parentNode&&(this.cursor.parentNode.removeChild(this.cursor),this.cursor=null),this.strPos=0,this.arrayPos=0,this.curLoop=0,t&&(this.insertCursor(),this.options.onReset(this),this.begin())}},{key:"begin",value:function(){var t=this;this.typingComplete=!1,this.shuffleStringsIfNeeded(this),this.insertCursor(),this.bindInputFocusEvents&&this.bindFocusEvents(),this.timeout=setTimeout(function(){t.currentElContent&&0!==t.currentElContent.length?t.backspace(t.currentElContent,t.currentElContent.length):t.typewrite(t.strings[t.sequence[t.arrayPos]],t.strPos)},this.startDelay)}},{key:"typewrite",value:function(t,e){var s=this;this.fadeOut&&this.el.classList.contains(this.fadeOutClass)&&(this.el.classList.remove(this.fadeOutClass),this.cursor&&this.cursor.classList.remove(this.fadeOutClass));var n=this.humanizer(this.typeSpeed),i=1;return this.pause.status===!0?void this.setPauseStatus(t,e,!0):void(this.timeout=setTimeout(function(){e=o.htmlParser.typeHtmlChars(t,e,s);var n=0,r=t.substr(e);if("^"===r.charAt(0)&&/^\^\d+/.test(r)){var a=1;r=/\d+/.exec(r)[0],a+=r.length,n=parseInt(r),s.temporaryPause=!0,s.options.onTypingPaused(s.arrayPos,s),t=t.substring(0,e)+t.substring(e+a),s.toggleBlinking(!0)}if("`"===r.charAt(0)){for(;"`"!==t.substr(e+i).charAt(0)&&(i++,!(e+i>t.length)););var u=t.substring(0,e),l=t.substring(u.length+1,e+i),c=t.substring(e+i+1);t=u+l+c,i--}s.timeout=setTimeout(function(){s.toggleBlinking(!1),e===t.length?s.doneTyping(t,e):s.keepTyping(t,e,i),s.temporaryPause&&(s.temporaryPause=!1,s.options.onTypingResumed(s.arrayPos,s))},n)},n))}},{key:"keepTyping",value:function(t,e,s){0===e&&(this.toggleBlinking(!1),this.options.preStringTyped(this.arrayPos,this)),e+=s;var n=t.substr(0,e);this.replaceText(n),this.typewrite(t,e)}},{key:"doneTyping",value:function(t,e){var s=this;this.options.onStringTyped(this.arrayPos,this),this.toggleBlinking(!0),this.arrayPos===this.strings.length-1&&(this.complete(),this.loop===!1||this.curLoop===this.loopCount)||(this.timeout=setTimeout(function(){s.backspace(t,e)},this.backDelay))}},{key:"backspace",value:function(t,e){var s=this;if(this.pause.status===!0)return void this.setPauseStatus(t,e,!0);if(this.fadeOut)return this.initFadeOut();this.toggleBlinking(!1);var n=this.humanizer(this.backSpeed);this.timeout=setTimeout(function(){e=o.htmlParser.backSpaceHtmlChars(t,e,s);var n=t.substr(0,e);if(s.replaceText(n),s.smartBackspace){var i=s.strings[s.arrayPos+1];i&&n===i.substr(0,e)?s.stopNum=e:s.stopNum=0}e>s.stopNum?(e--,s.backspace(t,e)):e<=s.stopNum&&(s.arrayPos++,s.arrayPos===s.strings.length?(s.arrayPos=0,s.options.onLastStringBackspaced(),s.shuffleStringsIfNeeded(),s.begin()):s.typewrite(s.strings[s.sequence[s.arrayPos]],e))},n)}},{key:"complete",value:function(){this.options.onComplete(this),this.loop?this.curLoop++:this.typingComplete=!0}},{key:"setPauseStatus",value:function(t,e,s){this.pause.typewrite=s,this.pause.curString=t,this.pause.curStrPos=e}},{key:"toggleBlinking",value:function(t){if(this.cursor&&!this.pause.status&&this.cursorBlinking!==t){this.cursorBlinking=t;var e=t?"infinite":0;this.cursor.style.animationIterationCount=e}}},{key:"humanizer",value:function(t){return Math.round(Math.random()*t/2)+t}},{key:"shuffleStringsIfNeeded",value:function(){this.shuffle&&(this.sequence=this.sequence.sort(function(){return Math.random()-.5}))}},{key:"initFadeOut",value:function(){var t=this;return this.el.className+=" "+this.fadeOutClass,this.cursor&&(this.cursor.className+=" "+this.fadeOutClass),setTimeout(function(){t.arrayPos++,t.replaceText(""),t.strings.length>t.arrayPos?t.typewrite(t.strings[t.sequence[t.arrayPos]],0):(t.typewrite(t.strings[0],0),t.arrayPos=0)},this.fadeOutDelay)}},{key:"replaceText",value:function(t){this.attr?this.el.setAttribute(this.attr,t):this.isInput?this.el.value=t:"html"===this.contentType?this.el.innerHTML=t:this.el.textContent=t}},{key:"bindFocusEvents",value:function(){var t=this;this.isInput&&(this.el.addEventListener("focus",function(e){t.stop()}),this.el.addEventListener("blur",function(e){t.el.value&&0!==t.el.value.length||t.start()}))}},{key:"insertCursor",value:function(){this.showCursor&&(this.cursor||(this.cursor=document.createElement("span"),this.cursor.className="typed-cursor",this.cursor.innerHTML=this.cursorChar,this.el.parentNode&&this.el.parentNode.insertBefore(this.cursor,this.el.nextSibling)))}}]),t}();e["default"]=a,t.exports=e["default"]},function(t,e,s){"use strict";function n(t){return t&&t.__esModule?t:{"default":t}}function i(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}Object.defineProperty(e,"__esModule",{value:!0});var r=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var s=arguments[e];for(var n in s)Object.prototype.hasOwnProperty.call(s,n)&&(t[n]=s[n])}return t},o=function(){function t(t,e){for(var s=0;s<e.length;s++){var n=e[s];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}return function(e,s,n){return s&&t(e.prototype,s),n&&t(e,n),e}}(),a=s(2),u=n(a),l=function(){function t(){i(this,t)}return o(t,[{key:"load",value:function(t,e,s){if("string"==typeof s?t.el=document.querySelector(s):t.el=s,t.options=r({},u["default"],e),t.isInput="input"===t.el.tagName.toLowerCase(),t.attr=t.options.attr,t.bindInputFocusEvents=t.options.bindInputFocusEvents,t.showCursor=!t.isInput&&t.options.showCursor,t.cursorChar=t.options.cursorChar,t.cursorBlinking=!0,t.elContent=t.attr?t.el.getAttribute(t.attr):t.el.textContent,t.contentType=t.options.contentType,t.typeSpeed=t.options.typeSpeed,t.startDelay=t.options.startDelay,t.backSpeed=t.options.backSpeed,t.smartBackspace=t.options.smartBackspace,t.backDelay=t.options.backDelay,t.fadeOut=t.options.fadeOut,t.fadeOutClass=t.options.fadeOutClass,t.fadeOutDelay=t.options.fadeOutDelay,t.isPaused=!1,t.strings=t.options.strings.map(function(t){return t.trim()}),"string"==typeof t.options.stringsElement?t.stringsElement=document.querySelector(t.options.stringsElement):t.stringsElement=t.options.stringsElement,t.stringsElement){t.strings=[],t.stringsElement.style.display="none";var n=Array.prototype.slice.apply(t.stringsElement.children),i=n.length;if(i)for(var o=0;o<i;o+=1){var a=n[o];t.strings.push(a.innerHTML.trim())}}t.strPos=0,t.arrayPos=0,t.stopNum=0,t.loop=t.options.loop,t.loopCount=t.options.loopCount,t.curLoop=0,t.shuffle=t.options.shuffle,t.sequence=[],t.pause={status:!1,typewrite:!0,curString:"",curStrPos:0},t.typingComplete=!1;for(var o in t.strings)t.sequence[o]=o;t.currentElContent=this.getCurrentElContent(t),t.autoInsertCss=t.options.autoInsertCss,this.appendAnimationCss(t)}},{key:"getCurrentElContent",value:function(t){var e="";return e=t.attr?t.el.getAttribute(t.attr):t.isInput?t.el.value:"html"===t.contentType?t.el.innerHTML:t.el.textContent}},{key:"appendAnimationCss",value:function(t){if(t.autoInsertCss&&t.showCursor&&t.fadeOut){var e=document.createElement("style");e.type="text/css";var s="";t.showCursor&&(s+="\n        .typed-cursor{\n          opacity: 1;\n          animation: typedjsBlink 0.7s infinite;\n          -webkit-animation: typedjsBlink 0.7s infinite;\n                  animation: typedjsBlink 0.7s infinite;\n        }\n        @keyframes typedjsBlink{\n          50% { opacity: 0.0; }\n        }\n        @-webkit-keyframes typedjsBlink{\n          0% { opacity: 1; }\n          50% { opacity: 0.0; }\n          100% { opacity: 1; }\n        }\n      "),t.fadeOut&&(s+="\n        .typed-fade-out{\n          opacity: 0;\n          transition: opacity .25s;\n          -webkit-animation: 0;\n                  animation: 0;\n        }\n      "),0!==e.length&&(e.innerHTML=s,document.head.appendChild(e))}}}]),t}();e["default"]=l;var c=new l;e.initializer=c},function(t,e){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var s={strings:["These are the default values...","You know what you should do?","Use your own!","Have a great day!"],stringsElement:null,typeSpeed:0,startDelay:0,backSpeed:0,smartBackspace:!0,shuffle:!1,backDelay:700,fadeOut:!1,fadeOutClass:"typed-fade-out",fadeOutDelay:500,loop:!1,loopCount:1/0,showCursor:!0,cursorChar:"|",autoInsertCss:!0,attr:null,bindInputFocusEvents:!1,contentType:"html",onComplete:function(t){},preStringTyped:function(t,e){},onStringTyped:function(t,e){},onLastStringBackspaced:function(t){},onTypingPaused:function(t,e){},onTypingResumed:function(t,e){},onReset:function(t){},onStop:function(t,e){},onStart:function(t,e){},onDestroy:function(t){}};e["default"]=s,t.exports=e["default"]},function(t,e){"use strict";function s(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}Object.defineProperty(e,"__esModule",{value:!0});var n=function(){function t(t,e){for(var s=0;s<e.length;s++){var n=e[s];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}return function(e,s,n){return s&&t(e.prototype,s),n&&t(e,n),e}}(),i=function(){function t(){s(this,t)}return n(t,[{key:"typeHtmlChars",value:function(t,e,s){if("html"!==s.contentType)return e;var n=t.substr(e).charAt(0);if("<"===n||"&"===n){var i="";for(i="<"===n?">":";";t.substr(e+1).charAt(0)!==i&&(e++,!(e+1>t.length)););e++}return e}},{key:"backSpaceHtmlChars",value:function(t,e,s){if("html"!==s.contentType)return e;var n=t.substr(e).charAt(0);if(">"===n||";"===n){var i="";for(i=">"===n?"<":"&";t.substr(e-1).charAt(0)!==i&&(e--,!(e<0)););e--}return e}}]),t}();e["default"]=i;var r=new i;e.htmlParser=r}])});
//# sourceMappingURL=typed.min.js.map
}.call(window);

// type-sim.min.js, for SugarCube 2, by Chapel
;Macro.add("typesim",{tags:null,handler:function(){var t=$(document.createElement("textarea")),e=$(document.createElement("div"));if(1!==this.args.length)return this.error("incorrect number of arguments");if("string"!=typeof this.args[0])return this.error("argument should be a string");var r=this.args[0],a="",n=r.length,i=0,s="typesim-output-"+r.replace(/[^A-Za-z0-9]/g,""),o="macro-"+this.name,d=this.payload[0].contents;t.wiki(a).attr({id:s,readonly:!0}).addClass(o).appendTo(this.output),$(document).on("keydown","#"+s,function(t){i<n&&(a+=r.charAt(i),$("#"+s).empty().wiki(a)),i===n&&e.wiki(d).addClass(o).insertAfter("#"+s),i++})}});
// end type-sim.min.js
