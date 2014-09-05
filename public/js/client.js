/** @jsx React.DOM */

var ClientPage = React.createClass({

   render: function() {
    return (
      <div>
        <h1>MQTT client <small>AirVantage</small></h1>
        <hr/>
        <SendData />
        <hr/>
        <ReceiveTasks />
      </div>
    );
  }
});


var SendData = React.createClass({

	getInitialState: function() {
    	return {data: [], selected: []};
  	},

	addData: function(e) {
	    e.preventDefault();
	    var path = this.refs.newpath.getDOMNode().value.trim();	
	    if (!path) {
	      return;
	    }    
	    // TODO check unicity
	    var newData = this.state.data;
	    newData.push({label: path, path: path});
	    this.setState({data: newData});
	    return;
  	},

  	onDataChange: function(data, selected) {
  		var newSelected = this.state.selected;
  		var oldIdx;
  		for(s in newSelected) {
  			if(newSelected[s].path == data.path) {
  				oldIdx = s;
  			}
  		}
  		if(oldIdx) {
  			newSelected.splice(oldIdx, 1);
  		}
  		if(selected) {
  			newSelected.push(data);
  		} 		

  		this.setState({selected: newSelected});
  	},

  	send: function() {
  		console.log(this.state.selected);

  		$.ajax({
			type: "POST",
		    url: "/api/publish",
		    data: JSON.stringify(this.state.selected),
		    dataType: "json",
		    contentType: 'application/json; charset=utf-8',
		    success: function(data) {
		       console.log("youpi");
		    }.bind(this),
		    error: function(xhr, status, err) {
		       console.error(status, err.toString());
		    }.bind(this)
	    });
  	},

  	render: function() {
	    return (
	      	<div>
	      		<h2>Send data</h2>
		        <form className="form-horizontal" onSubmit={this.addData}>
					<div className="form-group">
					    <div className="col-md-offset-4 col-md-4">
					      	<input className="form-control" id="path" placeholder="Enter a new data path..." ref="newpath"/>
					    </div>
					    <div className="col-md-1">
					    	<button type="submit" className="btn btn-default">Add</button>
					    </div>
				 	</div>
				</form>
		        <DataList data={this.state.data} onDataChange={this.onDataChange}/>
		       	<button disabled={this.state.selected.length == 0} className="btn btn-lg btn-default center-block" onClick={this.send}>Send {this.state.selected.length} data</button>	        
	      	</div>
	    );
  	}
});

var DataList = React.createClass({
	
   	handleDataChange: function(data, selected) {
    	this.props.onDataChange(data, selected);
    },

  	render: function() {
	    return (
	      	<div className="col-md-offset-1 col-md-10">
				{this.props.data.map(function(data, index) {
				    return (
				    	<Data label={data.label} path={data.path} key={index} onDataChange={this.handleDataChange}/>
				    );
				}, this)}
	      	</div>
	    );
	}
});


var Data = React.createClass({

  handleChange: function(e) {
  	this.props.onDataChange({path: this.props.path, value: this.refs.value.getDOMNode().value}, this.refs.checkbox.getDOMNode().checked);
  },

  render: function() {


  	var style = {
  		marginBottom: '5px'
	};

	var checkbox = {
  		marginTop: '10px'
	};

    return (

   		<div className="well well-sm row">
			<div className="col-md-1" >
				<input type="checkbox" onChange={this.handleChange} ref="checkbox" style={checkbox}/>
			</div>
			<div className="col-md-4" >
				<p className="col-sm-2 form-control-static"><strong>Path</strong></p>
				<p className="col-sm-10 form-control-static">{this.props.label}</p>
			</div>
			<div className="col-md-7" >
				<p className="col-sm-2 form-control-static"><strong>Value</strong></p>
				<div className="col-md-10">
			   		<input className="form-control" id="value" ref="value" onChange={this.handleChange}/>
			   	</div>
			</div>
		</div>
    );
  }
});

var ReceiveTasks = React.createClass({

	getInitialState: function() {
    	return {tasks: []};
  	},

	componentDidMount: function() {
		// Let us open a web socket
		var ws = new WebSocket("ws://localhost:8000/api/ws/tasks");
		ws.onopen = function() {
			console.log("WS connected");
		};
		ws.onmessage = function (evt) { 
			var received_msg = JSON.parse(evt.data);
			console.log("WS message: " + received_msg);
			
			var newtasks = this.state.tasks;
			for(i in received_msg) {
				console.log(received_msg[i]);
				newtasks.push(received_msg[i]);	
			}

			this.setState({tasks: newtasks});
		}.bind(this);
		ws.onclose = function() { 
			console.log("WS connection is closed..."); 
		};
	},

	render: function() {
		return (
		  	<div>
				<h2>Receive tasks</h2>
				<TaskList tasks={this.state.tasks}/>
		  	</div>
		);
	}
});

var TaskList = React.createClass({

	render: function() {
	    return (
	      	<div className="col-md-offset-1 col-md-10">
				{this.props.tasks.map(function(task, index) {
				    return (
				    	<Task task={task} key={index} />
				    );
				}, this)}
	      	</div>
	    );
  	}
});

var Task = React.createClass({

	type: function(task) {
		if(task['command']) {
	 		return "Command";
	 	}
	 	else if(task['write']) {
	 		return "Write";
	 	}
	},

	details: function(task) {
		var details = ""
		if(task['command']) {
			details = details.concat("Name: " + task.command.id);
			if(task.command.params && !jQuery.isEmptyObject(task.command.params)) {
				details = details.concat(" - Parameters: ");
				var params = [];
				for(i in task.command.params) {
					params.push(i + "=" + task.command.params[i]);
				}
				details = details.concat(params.join(", "));
			}
	 	}
	 	else if(task['write']) {
	 		details = details.concat("Settings: "); 
	 		var settings = [];
	 		for(i in task.write) {
	 			var setting = task.write[i];
	 			var path = Object.keys(setting)[0];
	 			settings.push(path + "=" + setting[path]);
	 		}
	 		details = details.concat(settings.join(", "));
	 	}
	 	return details;
	},

 	render: function() {

	    return (
	    	<div className="well well-sm row">
				<div className="col-md-3">
					{new Date(this.props.task.timestamp).toLocaleString()}
				</div>
				<div className="col-md-2">
					<strong>{this.type(this.props.task)}</strong>
				</div>
				<div className="col-md-7">
					{this.details(this.props.task)}
				</div>
	      </div>
	    );
  	}
});



React.renderComponent(
  <ClientPage />, document.getElementById('content')
);


