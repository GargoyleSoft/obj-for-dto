# Object for DTO

This is a schematic to auto-generate your model file based on the defined DTO type.

## Installation

```bash
ng add @gargoylesoft/obj-for-dto
```

The schematic will get installed as well as creating a file at `src/app/has-value.ts` which implements a type guard.

## Usage

The first parameter to the schematic should be the class name to create, and the second is a comma separated list of
properties to include in the model. Property names will default to a `string` type if not specified. You specify the
type of the property by appending a `:` and a type name. 

If the property is an array, you can add `[]` after the type name.

If the property is optional, you can add a `?` character after the type name.  

The following shortcut types are available:

- `s` -> `string`
- `n` -> `number`
- `b` -> `boolean`
- `d` -> `Date`

## Assumptions

1. The generated class does not use undefined values. Non-present optional values get set to `null`
2. Arrays always have a value. Non-present optional arrays are set to an empty array.
3. Empty strings that are nullable and not present are set to null.
4. Only call the constructor in your unit tests.

## Usage in Angular

Use the `fromJson` static method in your angular service:

```typescript
@Injectable({
    providedIn: 'root'
})
export class EmployeeService {
    readonly #http = inject(HttpClient)
    
    getEmployee(id: string): Observable<Employee | undefined> {
        return this.#http.get<EmployeeDTO>('...').pipe(
            map(Employee.fromJson)
        )
    }
    
    getAllEmployees(): Observable<Employee[] | undefined> {
        return this.#http.get<EmployeeDTO[]>('...').pipe(
            map(x => x.map(Employee.fromJson).filter(hasValue))
        )
    }
}
```

Notice in the `getAllEmployees` example the array of entries is passed to the `fromJson` method, which will return 
`undefined` if parsing failed. You then pass that to `filter(hasValue)` to only include validated objects in the result
set.

Depending on your workflow, you can either ignore bad input, as shown here, or do something more intelligent to throw 
an error if any results failed to parse. 


## Example

Create a simple `Employee` model:

```bash
ng g @gargoylesoft/obj-for-dto:obj-for-dto Employee name,email,wwid:n,active:b
```

results in the following file being created:

```typescript
import {hasValue} from '../has-value'

export type IEmployee = {
   active: boolean
   email: string
   name: string
   wwid: number
}

export type EmployeeDTO = Partial<IEmployee>

export class Employee implements IEmployee {
    constructor(
      public readonly active: boolean,
      public readonly email: string,
      public readonly name: string,
      public readonly wwid: number
    ) {
    }

    static fromJson(json: EmployeeDTO | null | undefined): Employee | undefined {
        if (!(json && hasValue(json.active) && json.email && json.name && hasValue(json.wwid)))
            return undefined

        return new Employee(json.active, json.email, json.name, json.wwid)
    }
}
```
Showing all possibilities by using a name of `Example` and a property list of `requiredString,optionalString:s?,requiredStringArray:s[],optionalStringArray:s[]?,requiredDate:d,optionalDate:d?,requiredDateArray:d[],optionalDateArray:d[]?,requiredNumber:n,optionalNumber:n?,requiredNumberArray:n[],optionalNumberArray:n[]?,requiredBoolean:b,optionalBoolean:b?,requiredBooleanArray:b[],optionalBooleanArray:b[]?,requiredEmployee:Employee,optionalEmployee:Employee?,requiredEmployeeArray:Employee[],optionalEmployeeArray:Employee[]?`

results in the following file being created:

```typescript
import {Employee, EmployeeDTO, IEmployee} from './employee'
import {hasValue} from '../has-value'

export type IExample = {
    optionalBoolean: boolean | null
    optionalBooleanArray: boolean[]
    optionalDate: Date | null
    optionalDateArray: Date[]
    optionalEmployee: IEmployee | null
    optionalEmployeeArray: IEmployee[]
    optionalNumber: number | null
    optionalNumberArray: number[]
    optionalString: string | null
    optionalStringArray: string[]
    requiredBoolean: boolean
    requiredBooleanArray: boolean[]
    requiredDate: Date
    requiredDateArray: Date[]
    requiredEmployee: IEmployee
    requiredEmployeeArray: IEmployee[]
    requiredNumber: number
    requiredNumberArray: number[]
    requiredString: string
    requiredStringArray: string[]
}

export type ExampleDTO = Omit<Partial<IExample>, 'optionalEmployee' | 'optionalEmployeeArray' | 'requiredEmployee' | 'requiredEmployeeArray'> & {
    optionalEmployee?: EmployeeDTO | null
    optionalEmployeeArray?: EmployeeDTO[] | null
    requiredEmployee?: EmployeeDTO | null
    requiredEmployeeArray?: EmployeeDTO[] | null
}

export class Example implements IExample {
    constructor(
        public readonly optionalBoolean: boolean | null,
        public readonly optionalBooleanArray: boolean[],
        public readonly optionalDate: Date | null,
        public readonly optionalDateArray: Date[],
        public readonly optionalEmployee: Employee | null,
        public readonly optionalEmployeeArray: Employee[],
        public readonly optionalNumber: number | null,
        public readonly optionalNumberArray: number[],
        public readonly optionalString: string | null,
        public readonly optionalStringArray: string[],
        public readonly requiredBoolean: boolean,
        public readonly requiredBooleanArray: boolean[],
        public readonly requiredDate: Date,
        public readonly requiredDateArray: Date[],
        public readonly requiredEmployee: Employee,
        public readonly requiredEmployeeArray: Employee[],
        public readonly requiredNumber: number,
        public readonly requiredNumberArray: number[],
        public readonly requiredString: string,
        public readonly requiredStringArray: string[]
    ) {
    }

    static fromJson(json: ExampleDTO | null | undefined): Example | undefined {
        if (!(json && hasValue(json.requiredBoolean) && Array.isArray(json.requiredBooleanArray) && json.requiredDate && Array.isArray(json.requiredDateArray) && Array.isArray(json.requiredEmployeeArray) && hasValue(json.requiredNumber) && Array.isArray(json.requiredNumberArray) && json.requiredString && Array.isArray(json.requiredStringArray)))
            return undefined

        let optionalBooleanArray: boolean[] = []
        if (json.optionalBooleanArray) {
            if (!Array.isArray(json.optionalBooleanArray))
                return undefined

            optionalBooleanArray = json.optionalBooleanArray.filter(hasValue)
            if (optionalBooleanArray.length !== json.optionalBooleanArray.length)
                return undefined
        }

        const optionalDate = json.optionalDate ? new Date(json.optionalDate) : null
        if (optionalDate && isFinite(optionalDate.getTime()))
            return undefined

        let optionalDateArray: Date[] = []
        if (json.optionalDateArray) {
            if (!Array.isArray(json.optionalDateArray))
                return undefined

            optionalDateArray = json.optionalDateArray?.map(x => new Date(x)).filter(x => isFinite(x.getTime()))
            if (optionalDateArray.length !== json.optionalDateArray.length)
                return undefined
        }

        const optionalEmployee = Employee.fromJson(json.optionalEmployee) ?? null

        const optionalEmployeeArray = json.optionalEmployeeArray.map(Employee.fromJson).filter(hasValue) ?? []

        let optionalNumberArray: number[] = []
        if (json.optionalNumberArray) {
            if (!Array.isArray(json.optionalNumberArray))
                return undefined

            optionalNumberArray = json.optionalNumberArray.filter(Number.isFinite)
            if (optionalNumberArray.length !== json.optionalNumberArray.length)
                return undefined
        }

        let optionalStringArray: string[] = []
        if (json.optionalStringArray) {
            if (!Array.isArray(json.optionalStringArray))
                return undefined

            optionalStringArray = json.optionalStringArray.filter(hasValue)
            if (optionalStringArray.length !== json.optionalStringArray.length)
                return undefined
        }

        let requiredBooleanArray: boolean[] = []
        if (!Array.isArray(json.requiredBooleanArray))
            return undefined

        requiredBooleanArray = json.requiredBooleanArray.filter(hasValue)
        if (requiredBooleanArray.length !== json.requiredBooleanArray.length)
            return undefined

        const requiredDate = new Date(json.requiredDate)
        if (isFinite(requiredDate.getTime()))
            return undefined

        let requiredDateArray: Date[] = []
        if (!Array.isArray(json.requiredDateArray))
            return undefined

        requiredDateArray = json.requiredDateArray?.map(x => new Date(x)).filter(x => isFinite(x.getTime()))
        if (requiredDateArray.length !== json.requiredDateArray.length)
            return undefined

        const requiredEmployee = Employee.fromJson(json.requiredEmployee)
        if (!requiredEmployee)
            return undefined

        const requiredEmployeeArray = json.requiredEmployeeArray.map(Employee.fromJson).filter(hasValue)
        if (!requiredEmployeeArray)
            return undefined

        let requiredNumberArray: number[] = []
        if (!Array.isArray(json.requiredNumberArray))
            return undefined

        requiredNumberArray = json.requiredNumberArray.filter(Number.isFinite)
        if (requiredNumberArray.length !== json.requiredNumberArray.length)
            return undefined

        let requiredStringArray: string[] = []
        if (!Array.isArray(json.requiredStringArray))
            return undefined

        requiredStringArray = json.requiredStringArray.filter(hasValue)
        if (requiredStringArray.length !== json.requiredStringArray.length)
            return undefined

        return new Example(hasValue(json.optionalBoolean) ? json.optionalBoolean : null, optionalBooleanArray, optionalDate, optionalDateArray, optionalEmployee, optionalEmployeeArray, hasValue(json.optionalNumber) ? json.optionalNumber : null, optionalNumberArray, json.optionalString || null, optionalStringArray, json.requiredBoolean, requiredBooleanArray, requiredDate, requiredDateArray, requiredEmployee, requiredEmployeeArray, json.requiredNumber, requiredNumberArray, json.requiredString, requiredStringArray)
    }
}
```
