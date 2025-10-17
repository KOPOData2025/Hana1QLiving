package com.living.hana.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Logging {

    String operation() default "";
    String category() default "GENERAL";
    boolean includeParams() default true;
    boolean includeResult() default false;
    boolean maskSensitive() default true;
    boolean measureTime() default true;
    String level() default "INFO";
}
