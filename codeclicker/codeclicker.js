var player = {clicks:0, cash:0, auto:0, cpu:1};


function autoclickr(){
	compile()
}
//window.onload = autoclickr;
setInterval("autoclickr();", 5);

function compile(){
	player.clicks += player.cpu;
	player.cash += player.cpu;
	
	var btn = document.createElement("P");
	btn.innerHTML = `+ £${player.cpu}`;
	btn.classList.add('animated', 'fadeOutUp');
	document.getElementById("worldspace").appendChild(btn);

	document.getElementById("cash").innerHTML = player.cash;
}

function payout(cost){
	player.cash -= Number(cost);
	document.getElementById("cash").innerHTML = player.cash;
}

function clicky(){
	compile();
	
	if (player.clicks > 20 && document.getElementById("blockauto").style.display === "none"){
	document.getElementById("blockauto").style.display = 'block';
	}
	
	if (player.clicks > 10 && document.getElementById("blockcpu").style.display === "none"){
	document.getElementById("blockcpu").style.display = 'block';
	}
}

function upgrade(type, cost){
	if (player.cash >= Number(cost)){
		payout(cost)
		player[type] += 1;
		//alert(`${type} is now at ${upgrades[type]}`);
		document.getElementById(type).innerHTML = player[type];
	}else{
		alert("You can't afford it.")
	}
}

function buy(obj, cost){
	if (player.cash >= Number(cost)){
		payout(cost)
		if (obj == "pepsi"){
			alert("You downed a pepsi and got to work!")
			for (i = 0; i < 5; ++i) {
				compile()
			}
		}
		document.getElementById(type).innerHTML = player[type];
	}else{
		alert(`You can't afford ${obj}, you only have ${player.cash}.`)
	}
}

