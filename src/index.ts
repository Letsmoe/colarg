import { Option, Command } from "./types";

/**
 * We want to create a class that is ease to understand, it is supposed to take
 * the arguments of the command line and return an object with each key mapped
 * to a value.
 *
 * The input should look something like this: `<command> <argument>=<value>`.
 *
 * Boolean arguments are by default set to false, meaning they will be set to
 * true by either the `--<name>` or `-<name>` syntax. You can, however, set the
 * value of an argument to `false` by simply doing this: `--<name>=(false | 0 |
 * no)` or `-<name>=(false | 0 | no)` when it's set to `true` by default.
 *
 * Number arguments are by default set to 0, meaning they will be set to the
 * value of the argument by either the `--<name>=<value>` or `-<name>=<value>`
 * syntax.
 *
 * String arguments are by default set to "", meaning they will be set to the
 * value of the argument by either the `--<name>=<value>` or `-<name>=<value>`
 * syntax.
 *
 * Array arguments use the `default` array syntax valid in JavaScript, meaning
 * they will look like this: `"[1,2,3, \"hello\"]"`, but they must be enclosed
 * by quotes otherwise they would get picked up as dozens of difficult
 * arguments.
 */

class colarg {
	private options: Option[] = [];
	private resultMap: { [key: string]: any } = {};
	private commands: Command[] = [];
	private staggeredExecution: Option[] = [];
	private usage: string = "";
	constructor(private args: string[]) {}

	private parse() {
		this.resultMap = {};
		// Loop through all the options and try to find one that matches the argument, but only if it starts with one or two dashes.
		for (const [i, arg] of this.args.entries()) {
			if (arg[0] === "-") {
				// We might have found an arguments name, so we need to check if it's in the list of options.
				let name: string;
				let firstEqualOccurrence =
					(arg.includes("=") && arg.indexOf("=")) || Infinity;
				// Get the actual name of the option, that means trimming the front dashes and going until the equal sign
				if (arg.startsWith("--")) {
					name = arg.substring(2, firstEqualOccurrence);
				} else {
					name = arg.substring(1, firstEqualOccurrence);
				}
				// Loop through all options and try to find a match.
				let foundOption = false;
				for (const option of this.options) {
					if (option.name === name || option.alias === name) {
						foundOption = true;
						// Check if it is a callable option and stash it for execution
						if (option.callback) {
							this.staggeredExecution.push(option);
						}
						// We found an argument, so we need to check if it has a value.
						if (arg.includes("=")) {
							let actualValue = this.getValue(arg);
							// Check if the types of value and expected value match else throw an error.
							if (
								option.type === "any" ||
								typeof actualValue === option.type ||
								(Array.isArray(actualValue) &&
									option.type === "array")
							) {
								// Set the value of the option.
								this.resultMap[option.name] = actualValue;
								this.resultMap[option.alias] = actualValue;
							} else {
								throw new TypeError(
									"Type mismatch, expected '" +
										option.type +
										"' but got '" +
										typeof actualValue +
										"'"
								);
							}
						} else {
							// The argument has no value, so we need to set the value to true.
							this.resultMap[option.name] = true;
							this.resultMap[option.alias] = true;
						}
					}
				}

				// Throw an error if we didn't expect that option.
				if (!foundOption) {
					throw new Error("Unknown option '" + name + "'");
				}
			} else {
				let isCommand = false;
				// We found a command or a default argument, so we need to check if it's in the list of commands.
				for (const command of this.commands) {
					if (command.name === arg) {
						isCommand = true;
						// We execute the command by passing a new colarg instance to it.
						// Splice the current argument
						this.args.splice(i, 1);
						// Create a new colarg instance and pass the remaining arguments to it.
						const newColarg = new colarg(this.args);
						// Loop through all commands options and add them
						for (const option of this.options.concat(
							command.args
						)) {
							newColarg.addOption(option);
						}
						newColarg.enableHelp();
						// Execute the command and return an empty object
						command.callback(newColarg.getArgs());
						return {};
					}
				}

				if (!isCommand) {
					// We found a default argument so we just push it to the array of defaults.
					this.resultMap["default"] = this.resultMap["default"] || [];
					this.resultMap["default"].push(arg);
				}
			}
		}

		// Loop through the staggered options and execute them.
		for (const option of this.staggeredExecution) {
			option.callback(this.resultMap, this.options, this.commands);
		}

		// Check if all required arguments are there.
		for (const option of this.options) {
			if (option.required && !this.resultMap[option.name]) {
				throw new Error(
					"Required argument '" + option.name + "' is missing"
				);
			}
		}
	}

	private getValue(arg: string) {
		// The argument has a value, so we need to get it.
		const value = arg.substring(arg.indexOf("=") + 1);
		// Check if the value is a boolean.
		if (
			["no", "false", "0", "1", "true", "yes", "y", "n"].indexOf(
				value.toLowerCase()
			) !== -1
		) {
			// The value is a boolean, so we need to set the value to the boolean.
			return ["true", "1", "yes", "y"].indexOf(value.toLowerCase()) > -1;
		}
		// Check if the value is a number.
		else if (!isNaN(Number(value))) {
			// The value is a number, so we need to set the value to the number.
			return Number(value);
		}
		// Check if the value is a string.
		else if (value[0] === '"' && value[value.length - 1] === '"') {
			// The value is a string, so we need to set the value to the string.
			return value.substring(1, value.length - 1);
		}
		// Check if the value is an array.
		else if (value[0] === "[" && value[value.length - 1] === "]") {
			// The value is an array, so we need to set the value to the array.
			return JSON.parse(value);
		}
		// The value is not a boolean, number, string or array, so we need to set the value to the value.
		else {
			return value;
		}
	}

	public defineUsage(message: string): void {
		this.usage = message;
	}

	public addOption({
		name,
		alias,
		type,
		defaults,
		description,
		required,
		callback
	}: Option): boolean {
		// Check if the option is already in the list of options
		if (
			this.options.find((x) => x.name === name) ||
			this.options.find((x) => x.alias === alias)
		) {
			return false;
		}

		// Add the option to the list of options
		this.options.push({
			name,
			alias,
			type,
			defaults,
			description,
			required,
			callback
		});
	}

	public addCommand(
		{ name, description, args },
		callback: (args: { [key: string]: any }) => boolean | void
	) {
		// Check if the command is already in the list of commands
		if (this.commands.find((x) => x.name === name)) {
			return false;
		}

		// Add the command to the list of commands
		this.commands.push({
			name,
			description,
			args,
			callback,
		});
	}

	public addOptions(options: Option[]): boolean {
		for (const option of options) {
			let worked = this.addOption(option);
			if (!worked) {
				return false;
			}
		}
	}

	public enableHelp() {
		const callback = (
			args: { [key: string]: any },
			options: Option[],
			commands: Command[]
		) => {
			console.clear()
			console.log(this.usage || "Usage:");
			let optionsArr = [
				[
					"Name",
					"Alias",
					"Type",
					"Default",
					"Description",
					"Required",
					"Callback",
				],
			];
			for (const option of options) {
				optionsArr.push([
					"--" + option.name,
					"-" + option.alias,
					option.type,
					option.defaults?.toString() || "",
					option.description,
					option.required ? "[REQUIRED]" : "[NOT REQUIRED]",
					option.callback ? "[CALLBACK]" : "",
				]);
			}
			const printTable = (table: string[][]) => {
				// Get the maximum lengths of each column in the array
				const maxLengths = table.reduce(
					(acc, curr) => {
						for (let i = 0; i < curr.length; i++) {
							if (acc[i] < (curr[i] && curr[i].length) || 0) {
								acc[i] = curr[i].length;
							}
						}
						return acc;
					},
					[0, 0, 0, 0, 0, 0, 0]
				);
				// Create a string with the correct length for each column
				const strings = table.map((curr) => {
					return curr
						.map((x: string, i: number) => {
							return x + " ".repeat(maxLengths[i] - x.length);
						})
						.join("  ");
				});
				// Print the table
				return strings.join("\n");
			};
			console.log(printTable(optionsArr));

			if (commands.length > 0) {
				let commandsArr = [["Name", "Description"]];
				console.log("");
				console.log("Commands:");
				for (const command of commands) {
					commandsArr.push([
						command.name,
						command.description,
						"\n",
						printTable(
							command.args.map((x: Option) => [
								"\t",
								"--" + x.name,
								"-" + x.alias,
								x.type,
							])
						),
					]);
				}
				console.log(printTable(commandsArr));
			}

			process.exit(0);
		};

		this.addOption({
			name: "help",
			description: "Shows the help message",
			alias: "h",
			type: "any",
			required: false,
			callback: callback,
		});
	}

	public getArgs() {
		this.parse();
		return this.resultMap;
	}
}

export { colarg };
