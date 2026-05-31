# demo

```ts
console.log('Hello World!') /* @1 */
```

{{ 'foo '.repeat(1000) }}

@1: Hello **World**!

{{ 'bar '.repeat(1000) }}

```ts
console.log('another annotation' /* @2 */)
```

{{ 'baz '.repeat(1000) }}

@2: This supports multiline content.

    Another paragraph in the same annotation.

    - Lists work.
    - _Inline markdown_ **works too**.

    ```ts {3}
    console.log('nested code in annotation') // make it longer to test scrolling
    // multiple lines
    console.log('line 3')
    ```

Paragraph outside the annotation.
