var player = {clicks:0, cash:0, auto:0, cpu:1, farm:0};

player.market = {cpucost: 20, autocost: 10, farmcost: 50, defaultfarmcost: 50, defaultcpucost: 20, defaultautocost: 10}

function autoclickr(){
	if (player.auto > 0){
		for (i = 0; i < player.auto; ++i){
			compile()
		}
	}
}

setInterval("autoclickr();", 5000);

function animateCSS(element, animationName, callback) {
    const node = document.querySelector(element)
    node.classList.add('animated', animationName)

    function handleAnimationEnd() {
        node.classList.remove('animated', animationName)
        node.removeEventListener('animationend', handleAnimationEnd)

        if (typeof callback === 'function') callback()
    }

    node.addEventListener('animationend', handleAnimationEnd)
}

function incrementAlgorithm(){
	invar = (player.cpu*1.1)
	invar += (player.farm*1.2)
	return Math.floor(Number(invar))
}

function compile(){
	player.clicks += incrementAlgorithm();
	player.cash += incrementAlgorithm();
	
	animateCSS('.wbutton', 'bounce')

	document.getElementById("cash").innerHTML = `£${player.cash}`;
	
	if (player.clicks > 10 && document.getElementById("blockauto").style.display === "none"){
		document.getElementById("blockauto").style.display = 'block';
	}
	
	if (player.clicks > 20 && document.getElementById("blockcpu").style.display === "none"){
		document.getElementById("blockcpu").style.display = 'block';
	}
}

function payout(cost){
	player.cash -= Number(cost);
	document.getElementById("cash").innerHTML = `£${player.cash}`;
}

function upgrade(type){
	if (player.cash >= Number(player.market[type+'cost'])){
		//Processing transaction
		payout(player.market[type+'cost'])
		player[type] += 1;
		document.getElementById(type).innerHTML = player[type];
		player.market[type+'cost'] = player.market['default'+type+'cost']*player[type];
		document.getElementById(`cost${type}`).innerHTML = `${player.market[type+'cost']}`
		
		//Updating clickpower UI
		document.getElementById('pwr').innerHTML = incrementAlgorithm();
		animateCSS('.cpwr', 'flash')
	}else{
		alert("You can't afford it.")
	}
}

function buy(obj, cost){
	if (player.cash >= Number(cost)){
		payout(cost)
		var delay = 0
		document.getElementById(obj).disabled = true;
		if (obj == "pepsi"){
			alert("You downed a pepsi and got to work!")
			for (i = 0; i < 5; ++i) {
				compile()
			}
			delay = 5000
		}
		
		setTimeout(function(){ 
			document.getElementById(obj).disabled = false;
			
		}, delay);
	}else{
		alert(`You can't afford ${obj}, you only have ${player.cash}.`)
	}
}

function help(obj){
	helpvars = {
		auto: "Automatically compiles at intervals.",
		cpu: "1.1x compile power modifier",
		farm: "1.2x compile power modifier"
	}
	alert(helpvars[obj])
}

