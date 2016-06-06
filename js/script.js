var X = XLSX;
var compiled = [];

function compile_results(res){

	for(var i=0; i<res.length; i++){
		//console.log(res[i]);
		compiled.push(res[i]);
	}

	reset();
	get_options(compiled);

}


function fixdata(data) {
	var o = "", l = 0, w = 10240;
	for(; l<data.byteLength/w; ++l) o+=String.fromCharCode.apply(null,new Uint8Array(data.slice(l*w,l*w+w)));
	o+=String.fromCharCode.apply(null, new Uint8Array(data.slice(l*w)));
	return o;
}

function display_stock(ima, name, stock){
	$('#res-table').append("<tr>");

	$('#res-table').append("<td>" + ima + "</td>");
	$('#res-table').append("<td>" + name + "</td>");
	$('#res-table').append("<td>" + stock["HLD"] + "</td>");
	$('#res-table').append("<td>" + stock["COST"] + "</td>");
	$('#res-table').append("<td>" + stock["PORT"] + "</td>");


	$('#res-table').append("<td>");
}

function update_table(key, res){
	$('#res-table').html("");

	res.forEach(function(item){
		var stocks = item["STOCKS"];

		if(typeof stocks[key] === "undefined"){
			return;
		}


		display_stock(item["IMA"], item["NAME"], stocks[key]);
	})

	
	$('#table').tablesorter();


}

function get_options(res){
	var options = [];

	res.forEach(function(elem){
		var res = [];
		for (var key in elem["STOCKS"]){
			res.push(key)
		}
		options = _.union(options, res);
	})

	options.sort(function(a, b){
		if(a < b) return -1;
		else if (a > b) return 1;
		else return 0;
	})

	for(var i=0; i<options.length; i++){
		var opt = $('<option>', {value: options[i]});
		opt.text(options[i]);

		$('#stock-type').append(opt);
	}

	$('#stock-type').on('change', function(){
		update_table(this.value, res);
	})


}

function process_csv(txt){
	txt = txt.slice(txt.indexOf("SHEET: ", 1));
	var arr = txt.split('\n');

	var res = [];
	var curr = -1;
	var check = false;
	var alternate = false;
	for(var i=0; i<arr.length; i++){

		if(arr[i] == '\n' || arr[i] == '' || arr[i] == ',,,,,,,,,,' || arr[i] == ',,,,,,,,,,') continue;
		if((arr[i].indexOf("SHEET: ") > -1) && (arr[i].indexOf("SHEET: S") == -1)){
			res.push({})
			check = false;
			continue;
		}

		var latest = res.length - 1;

		
		var spl = arr[i].split(',');


		if(spl[0] == "IMA ACCOUNT NO:"){
			res[latest]["IMA"] = spl[3];
			res[latest]["STOCKS"] = {}
		} 

		else if ((spl[4] == "TA No.")||(spl[4] == "IMA No.")){
			alternate = true;
			res[latest]["IMA"] = spl[5];
			res[latest]["STOCKS"] = {}
		} 

		else if(spl[0] == "ACCOUNT NAME:"){
			res[latest]["NAME"] = spl[3];
		} 

		else if((spl[4] == "Account Name")){
			res[latest]["NAME"] = spl[5];
		}

		else if((spl[0] == " Stock Code ") || (spl[0] == "AS OF DATE")){
			check = true;
		} 

		else if(spl[0] == ""){
			check = false;
		} 

		else {
			if(!check) continue;

			
			var split = arr[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
			if(split[0] == "Gain/Loss" || split[0] == "Port"){
				continue;
			}

			//console.log(split);

			var secName;

			if(alternate){
				secName = split[4];
				//console.log(res[latest]);
				res[latest]["STOCKS"][secName] = {
					"HLD": split[5],
					"COST": split[6],
					"PORT": split[11]
				};
			} else {
				secName = split[0];
				res[latest]["STOCKS"][secName] = {
					"HLD": split[3],
					"COST": split[4],
					"PORT": split[10]
				};
			}
		}
	}

	return res;
}

function process_wb(workbook) {
	var result = [];
	workbook.SheetNames.forEach(function(sheetName) {
		var csv = X.utils.sheet_to_csv(workbook.Sheets[sheetName]);
		if(csv.length > 0){
			result.push("SHEET: " + sheetName);
			result.push("");
			result.push(csv);
		}
	});

	var csv = result.join("\n");

	return process_csv(csv);
}

function reset(){
	$('#res-table').html("");
	$('#stock-type').find('option').remove().end().append('<option value="">Please Select A Stock Type</option>');
}

$(document).ready(function(){

	$('#btn-submit').click(function(e){
		var val = $('#txtFileUpload').val();

		if(val === ""){
			alert("Please Upload File");
			return;
		}

		reset();

		var files = document.getElementById('txtFileUpload').files;

		if(!files){
			return;
		}

		for(var i=0; i<files.length; i++){
			var f = files[i];

			var r = new FileReader();
			r.onload = (function(f){
				return function(e){
					var data = e.target.result;

					var arr = fixdata(data);

					var wb = X.read(btoa(arr), {type: 'base64'});
					var res = process_wb(wb);

					compile_results(res);
				}
			})(f);

			r.readAsArrayBuffer(f)
		}

	})
})