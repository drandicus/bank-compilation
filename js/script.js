var X = XLSX;
var compiled = [];

function compile_results(res){

	for(var i=0; i<res.length; i++){

		compiled.push(res[i]);
	}
	get_options(compiled);

}


function fixdata(data) {
	var o = "", l = 0, w = 10240;
	for(; l<data.byteLength/w; ++l) o+=String.fromCharCode.apply(null,new Uint8Array(data.slice(l*w,l*w+w)));
	o+=String.fromCharCode.apply(null, new Uint8Array(data.slice(l*w)));
	return o;
}

function display_blank(ima, name){
	var str = '<tr attr-record="' + ima + '">';

	str += "<td>" + ima + "</td>";
	str +="<td>" + name + "</td>";
	str +="<td> N/A </td>";
	str +="<td> N/A </td>";
	str +="<td> N/A </td>";

	str += "</tr>";

	$('#res-table').append(str);
}

function display_stock(ima, name, stock){

	var str = '<tr attr-record="' + ima + '">';

	str += "<td>" + ima + "</td>";
	str +="<td>" + name + "</td>";
	str +="<td>" + stock["HLD"] + "</td>";
	str +="<td>" + stock["COST"] + "</td>";
	str +="<td>" + stock["PORT"] + "</td>";

	str += "</tr>";

	$('#res-table').append(str);

	var num = parseInt(stock["HLD"].replace(/,/g, ''));

	return num;
}


function display_modal(res, key, attr){

	$('#displaySingle').modal({
		keyboard:true
	});

	var found = null;

	var totalMV = 0;

	for(var i=0; i<res.length; i++){
		if(res[i]["IMA"] == attr){
			found = res[i];
		}
	}

	for(var stock_code in found["STOCKS"]){
		var raw = found["STOCKS"][stock_code]["MARKET"];
		totalMV += raw;
	}

	var stockDetails = found["STOCKS"][key];

	$('#modal-ima').html(found["IMA"]);
	$('#modal-name').html(found["NAME"]);
	$('#modal-hld').html(stockDetails["HLD"]);
	$('#modal-cost').html(stockDetails["COST"]);
	$('#modal-old').html(stockDetails["PORT"]);

	console.log(parseFloat(stockDetails["MP"]));
	$('#modal-mp').val(parseFloat(stockDetails["MP"]));

	$('#modal-calculate').click(function(e){
		var newPort = $('#modal-new').val();

		if(newPort == ''){
			alert("Please Enter a Value");
			return;
		}

		var amount = 0;
		if(newPort > stockDetails["PORT"]){
			$('#modal-buysell').html("BUY");
			amount = newPort - parseFloat(stockDetails["PORT"])
		} else {
			$('#modal-buysell').html("Sell");
			amount = parseFloat(stockDetails["PORT"]) - newPort;
		}

		amount *= totalMV;
		amount /= parseFloat(stockDetails["MP"]);

		$('#modal-result').val(Math.floor(amount));
	})



}

function display_hld(total){
	var str = '<tr disabled>';

	str += "<td></td>";
	str +="<td></td>";
	str +="<td><b>" + total + "</b></td>";
	str += "<td></td>";
	str +="<td></td>";

	str += "</tr>";

	$('#res-table').append(str);
}

function update_table(key, res){
	$('#res-table').html("");
	var hld_total = 0;


	for(var i=0; i<res.length; i++){
		var stocks = res[i]["STOCKS"];

		if(typeof stocks[key] === "undefined"){
			display_blank(res[i]["IMA"], res[i]["NAME"]);
			continue;
		}
		hld_total += display_stock(res[i]["IMA"], res[i]["NAME"], stocks[key]);
	}


	display_hld(hld_total);


	$('#res-table tr').click(function(e){
		var target = $(e.target);
		if(target.is("td")){
			target = target.parent();
		}

		if(target.is(":last-child")){
			return;
		}

		var attr = target.attr("attr-record");
		display_modal(res, key, attr);
	})

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

		else if((spl[0] == "") || (spl[0] == "Unrealized Gain/Loss")){
			check = false;
		} 

		else {
			if(!check) continue;

			
			var split = arr[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);

			if(split[0] == "Gain/Loss" 
				|| split[0] == "Port" 
				|| split[0] == "Unrealized Gain/Loss" 
				|| split[0] == "% of Port" 
				|| split[0] == " Investment Type "
				|| split[0].indexOf("Sheet") > -1
				|| split[0].indexOf("report name") > -1
			){
				continue;
			}


			var secName;

			if(alternate){
				secName = split[4];

				if(secName.charAt(0) == ' '){
					secName = secName.slice(1, -1);
				}

				var hld = split[5].replace(/['"]+/g, '');
				var market = split[7].replace(/,/g, '');
				market = market.replace(/['"]+/g, '')

				res[latest]["STOCKS"][secName] = {
					"HLD": hld,
					"COST": split[6],
					"PORT": split[11],
					"MARKET": parseFloat(market),
					"MP": split[7]
				};
			} else {
				secName = split[0];

				if(secName.charAt(0) == ' '){
					secName = secName.slice(1, -1);
				}
				var hld = split[3].replace(/['"]+/g, '');
				var market = split[7].replace(/,/g, '');
				market = market.replace(/['"]+/g, '')

				res[latest]["STOCKS"][secName] = {
					"HLD": hld,
					"COST": split[4],
					"PORT": split[10],
					"MARKET": parseFloat(market),
					"MP": split[6]
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
	compiled = [];

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