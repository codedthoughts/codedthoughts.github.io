var clicks = 0;
var cash = 0;

var upgrades = {auto:0, cpu:1}; 
//Auto timers +1 compile per second
//CPU makes compilers worth more

function compile(){
	clicks += upgrades.cpu
	cash += upgrades.cpu
}
function clicky(){
	//clicks = Number(document.getElementById("clicks").innerHTML)
	compile()
	document.getElementById("clicks").innerHTML = clicks
	if (clicks > 10 && document.getElementById("upgauto").style.display === "none"){
	document.getElementById("upgauto").style.display = 'block'
	}
}

function upgrade(type){
	if (cash >= 10){
		upgrades[type] += 1
		alert(`${type} is now at ${upgrades[type]}`)
	}else{
		alert("You can't afford it.")
	}
}

