package com.example.helloworld;

/**
 * HelloWorld application - entry point for the manyu_test1 project.
 *
 * <p>Prints "Hello, World!" to standard output as a basic verification
 * that the Java toolchain and project structure are functional.
 *
 * @since 1.0
 */
public final class HelloWorld {

    /** The greeting message printed to stdout. */
    private static final String GREETING = "Hello, World!";

    private HelloWorld() {
        // Utility class — prevent instantiation
    }

    /**
     * Application entry point.
     *
     * @param args command-line arguments (not used)
     */
    public static void main(final String[] args) {
        System.out.println(GREETING);
    }
}