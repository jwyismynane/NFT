AnimationLock=false;
function OpenBlindBox(){
	if(AnimationLock)return false;
	
	var BlindBox=document.querySelector(".BlindBox");

	var Top=document.querySelector(".BlindBox .Top");
	var Bottom=document.querySelector(".BlindBox .Bottom");
	var Left=document.querySelector(".BlindBox .Left");
	var Right=document.querySelector(".BlindBox .Right");
	var Front=document.querySelector(".BlindBox .Front");
	var Back=document.querySelector(".BlindBox .Back");
	
	var BoxInside=document.querySelector(".BlindBox .BoxInside");
	var Button=document.querySelector(".Button");
	
	//Change BlindBox Item
	if(Math.random()<0.5){
		BoxInside.style="opacity:0";
	}else{
		BoxInside.style="";
	}
	
	BlindBox.style="animation-iteration-count:1;";
	
	Top.style="transform:translate3d(0,-15vw,0) rotateX(90deg)";
	
	Left.style="transform:translate3d(-10vw,0,0) rotateY(-90deg) rotateX(-90deg)";
	Right.style="transform:translate3d(10vw,0,0) rotateY(90deg) rotateX(-90deg)";
	Front.style="transform:translate3d(0,0,10vw) rotateX(-90deg)";
	Back.style="transform:translate3d(0,0,-10vw) rotateY(180deg) rotateX(-90deg)";
	
	Button.style="filter:grayscale(1);pointer-events:none";
	AnimationLock=true;
	
	setTimeout(function(){
		setTimeout(function(){
			BlindBox.style="";
			Button.style="";
			AnimationLock=false;
		},1000);
	
		Top.style="";
		Bottom.style="";
		Left.style="";
		Right.style="";
		Front.style="";
		Back.style="";
	},3000);
}