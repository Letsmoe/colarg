import { Option } from "./types";
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
declare class colarg {
    private args;
    private options;
    private resultMap;
    private commands;
    private staggeredExecution;
    private usage;
    constructor(args: string[]);
    private parse;
    private getValue;
    defineUsage(message: string): void;
    addOption({ name, alias, type, defaults, description, required, callback }: Option): boolean;
    addCommand({ name, description, args }: {
        name: any;
        description: any;
        args: any;
    }, callback: (args: {
        [key: string]: any;
    }) => boolean | void): boolean;
    addOptions(options: Option[]): boolean;
    enableHelp(): void;
    getArgs(): {
        [key: string]: any;
    };
}
export { colarg };
